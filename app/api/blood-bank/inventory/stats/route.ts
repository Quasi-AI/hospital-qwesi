import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import BloodInventory from '@/models/BloodInventory';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const components = ['whole-blood', 'packed-rbc', 'platelets', 'plasma', 'cryoprecipitate'];

    // Get available units by blood group
    const availableByGroup = await BloodInventory.aggregate([
      { 
        $match: { 
          status: 'available',
          testingStatus: 'cleared',
          expiryDate: { $gt: new Date() }
        } 
      },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 }, totalVolume: { $sum: '$volume' } } },
      { $sort: { _id: 1 } }
    ]);

    // Get available units by component
    const availableByComponent = await BloodInventory.aggregate([
      { 
        $match: { 
          status: 'available',
          testingStatus: 'cleared',
          expiryDate: { $gt: new Date() }
        } 
      },
      { $group: { _id: '$component', count: { $sum: 1 }, totalVolume: { $sum: '$volume' } } },
      { $sort: { _id: 1 } }
    ]);

    // Get status counts
    const statusCounts = await BloodInventory.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get testing status counts
    const testingStatusCounts = await BloodInventory.aggregate([
      { $group: { _id: '$testingStatus', count: { $sum: 1 } } }
    ]);

    // Get expiring soon (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const expiringSoon = await BloodInventory.countDocuments({
      status: 'available',
      expiryDate: { $lte: sevenDaysFromNow, $gt: new Date() }
    });

    // Get expired units needing disposal
    const expiredNotDiscarded = await BloodInventory.countDocuments({
      expiryDate: { $lt: new Date() },
      status: { $nin: ['discarded', 'issued'] }
    });

    // Low stock alert (less than 5 units)
    const lowStockGroups = [];
    for (const group of bloodGroups) {
      const count = await BloodInventory.countDocuments({
        bloodGroup: group,
        status: 'available',
        testingStatus: 'cleared',
        expiryDate: { $gt: new Date() }
      });
      if (count < 5) {
        lowStockGroups.push({ bloodGroup: group, count });
      }
    }

    // Format available by group to include all blood groups
    const formattedAvailableByGroup = bloodGroups.map(group => {
      const found = availableByGroup.find(item => item._id === group);
      return {
        bloodGroup: group,
        count: found?.count || 0,
        totalVolume: found?.totalVolume || 0
      };
    });

    // Format available by component
    const formattedAvailableByComponent = components.map(comp => {
      const found = availableByComponent.find(item => item._id === comp);
      return {
        component: comp,
        count: found?.count || 0,
        totalVolume: found?.totalVolume || 0
      };
    });

    return NextResponse.json({
      availableByGroup: formattedAvailableByGroup,
      availableByComponent: formattedAvailableByComponent,
      statusCounts: statusCounts.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      testingStatusCounts: testingStatusCounts.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      expiringSoon,
      expiredNotDiscarded,
      lowStockGroups,
      totalAvailable: formattedAvailableByGroup.reduce((sum, g) => sum + g.count, 0)
    });
  } catch (error: unknown) {
    console.error('Error fetching blood inventory stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch blood inventory stats';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
