'use client';

import { AlertTriangle, CheckCircle, Info, Activity } from 'lucide-react';

interface FormattedAIResultProps {
  content: string;
  type: string;
}

export default function FormattedAIResult({ content, type }: FormattedAIResultProps) {
  const renderInline = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <span key={index} className="font-semibold text-gray-900">
            {part.slice(2, -2)}
          </span>
        );
      }

      return <span key={index}>{part}</span>;
    });

  const stripMarkdown = (text: string) =>
    text
      .replace(/^#{1,6}\s*/, '')
      .replace(/\*\*/g, '')
      .trim();

  // Parse the content into sections
  const parseContent = (text: string) => {
    const sections: any[] = [];
    let currentSection: any = null;
    const lines = text.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Patient Summary
      if (/^\*{0,2}Patient Summary:\*{0,2}$/i.test(trimmed) || /^#{1,6}\s*Patient Summary:?/i.test(trimmed)) {
        if (currentSection) sections.push(currentSection);
        currentSection = { type: 'summary', title: 'Patient Summary', items: [] };
        return;
      }

      // Markdown section headers (#, ##, ###...) or bold-only headings
      if (/^#{1,6}\s+\S/.test(trimmed) || (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 5)) {
        if (currentSection) sections.push(currentSection);
        const title = stripMarkdown(trimmed).replace(/:$/, '');
        currentSection = { type: 'section', title, content: [] };
        return;
      }

      // Tables
      if (trimmed.includes('|') && trimmed.split('|').length >= 3) {
        if (!currentSection || currentSection.type !== 'table') {
          if (currentSection) sections.push(currentSection);
          currentSection = { type: 'table', rows: [] };
        }
        const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 2 && !cells[0].includes('---')) {
          currentSection.rows.push(cells);
        }
        return;
      }

      // Risk/Urgency indicators
      if (trimmed.includes('Urgency:') || trimmed.includes('Risk:')) {
        if (currentSection) sections.push(currentSection);
        currentSection = { type: 'risk', title: 'Risk Assessment', items: [] };
        currentSection.items.push(trimmed);
        return;
      }

      // Lists (starting with -, *, or numbered items)
      if (/^[-*]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
        if (!currentSection) {
          currentSection = { type: 'list', items: [] };
        }
        if (currentSection.type === 'list' || currentSection.type === 'section') {
          const item = trimmed.replace(/^[-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
          if (item) {
            if (!currentSection.items) currentSection.items = [];
            currentSection.items.push(item);
          }
        }
        return;
      }

      // Regular content
      if (trimmed && !trimmed.startsWith('---')) {
        if (!currentSection) {
          currentSection = { type: 'paragraph', content: [] };
        }
        if (currentSection.type === 'section' || currentSection.type === 'paragraph') {
          if (!currentSection.content) currentSection.content = [];
          const cleanLine = trimmed.trim();
          if (cleanLine) {
            currentSection.content.push(cleanLine);
          }
        } else if (currentSection.type === 'summary') {
          const cleanLine = trimmed.trim();
          if (cleanLine && !cleanLine.startsWith('-')) {
            currentSection.items.push(cleanLine);
          }
        } else if (currentSection.type === 'risk') {
          const cleanLine = trimmed.trim();
          if (cleanLine) {
            currentSection.items.push(cleanLine);
          }
        }
      }
    });

    if (currentSection) sections.push(currentSection);
    return sections;
  };

  const sections = parseContent(content);

  const getRiskColor = (text: string) => {
    if (text.toLowerCase().includes('high') || text.toLowerCase().includes('critical')) {
      return 'text-red-700 bg-red-50 border-red-200';
    }
    if (text.toLowerCase().includes('moderate')) {
      return 'text-orange-700 bg-orange-50 border-orange-200';
    }
    if (text.toLowerCase().includes('low')) {
      return 'text-green-700 bg-green-50 border-green-200';
    }
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  return (
    <div className="space-y-6">
      {sections.map((section, index) => {
        if (section.type === 'summary') {
          return (
            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>{section.title}</span>
              </h4>
              <div className="space-y-2">
                {section.items.map((item: string, i: number) => (
                  <div key={i} className="text-sm text-blue-800">
                    {item.includes(':') ? (
                      <>
                        <span className="font-semibold">{stripMarkdown(item.split(':')[0])}:</span>
                        <span className="ml-2">{renderInline(item.split(':').slice(1).join(':').trim())}</span>
                      </>
                    ) : (
                      renderInline(stripMarkdown(item))
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (section.type === 'table') {
          return (
            <div key={index} className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
                <thead className="bg-gray-100">
                  {section.rows.length > 0 && (
                    <tr>
                      {section.rows[0].map((cell: string, i: number) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {section.rows.slice(1).map((row: string[], i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.map((cell: string, j: number) => (
                        <td
                          key={j}
                          className={`px-4 py-3 text-sm ${
                            j === 0 ? 'font-medium text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (section.type === 'risk') {
          return (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>{section.title}</span>
              </h4>
              <div className="space-y-3">
                {section.items.map((item: string, i: number) => {
                  const isUrgency = item.includes('Urgency:');
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        isUrgency ? getRiskColor(item) : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-line">
                        {renderInline(item)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (section.type === 'section') {
          const isRedFlags = section.title.toLowerCase().includes('red flag') || section.title.toLowerCase().includes('warning');
          const isSummary = section.title.toLowerCase().includes('summary');
          
          return (
            <div key={index} className="border rounded-lg p-4">
              <h4 className={`text-lg font-semibold mb-3 flex items-center space-x-2 ${
                isRedFlags ? 'text-red-700' : isSummary ? 'text-blue-700' : 'text-gray-900'
              }`}>
                {isRedFlags ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <Activity className="h-5 w-5" />
                )}
                <span>{section.title}</span>
              </h4>
              <div className="space-y-2">
                {section.content.map((line: string, i: number) => (
                  <div key={i} className="text-sm text-gray-700">
                    {renderInline(line)}
                  </div>
                ))}
                {section.items && section.items.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 mt-2">
                    {section.items.map((item: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700">
                        {renderInline(item)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        }

        if (section.type === 'list') {
          return (
            <div key={index} className="border rounded-lg p-4">
              <ul className="list-disc space-y-2 pl-5">
                {section.items.map((item: string, i: number) => (
                  <li key={i} className="text-sm text-gray-700">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // Default paragraph
        return (
          <div key={index} className="text-sm text-gray-700 leading-relaxed">
            {section.content?.map((line: string, i: number) => (
              <div key={i} className="mb-2">
                {renderInline(line)}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
