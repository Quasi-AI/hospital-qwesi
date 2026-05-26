'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  LayoutList,
  Library,
  MessageCircle,
  PanelRightOpen,
} from 'lucide-react';
import ProtectedRoute from '@/app/protected-route';
import SidebarLayout from '@/app/components/sidebar-layout';
import { useTranslations } from '@/app/hooks/useTranslations';
import { LandingChatWidgetSettings } from '@/app/components/landing-chat-widget-settings';
import { LandingKnowledgeBaseEditor } from '@/app/components/landing-knowledge-base-editor';

type AiChatTab = 'widget' | 'knowledge';

export default function AiChatSettingsPage() {
  const { t, translationsLoaded } = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AiChatTab>('widget');

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (!translationsLoaded || status === 'loading') {
    return (
      <ProtectedRoute>
        <SidebarLayout title="" description="" dense>
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          </div>
        </SidebarLayout>
      </ProtectedRoute>
    );
  }

  if (session?.user?.role !== 'admin') {
    return null;
  }

  return (
    <ProtectedRoute>
      <SidebarLayout title="AI Chat Settings" description="Landing chat widget and knowledge entries." dense>
        <div className="mx-auto max-w-6xl space-y-6 pb-8">
          {/* Top actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/settings"
              className="group inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
              {t('settings.title')}
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-medium text-teal-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
            >
              <ExternalLink className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {t('settings.hospitalWebsiteViewLive')}
            </a>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <MessageCircle className="h-4 w-4 text-teal-700" aria-hidden />
              <span className="text-sm font-medium text-gray-900">Landing assistant</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 ring-1 ring-teal-200/80">
                Public
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-md shadow-gray-900/[0.04]">
            <div className="lg:grid lg:grid-cols-[minmax(0,208px)_1fr] lg:gap-0 lg:items-start">
              {/* Left sidebar — desktop */}
              <aside className="hidden lg:block lg:border-r lg:border-gray-100 lg:bg-gray-50/40">
                <div className="sticky top-3 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    <LayoutList className="h-3.5 w-3.5" aria-hidden />
                    Sections
                  </p>
                  <nav
                    className="space-y-0.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm"
                    role="tablist"
                    aria-label="AI chat settings sections"
                  >
                    <button
                      type="button"
                      role="tab"
                      id="ai-chat-tab-widget-trigger"
                      aria-selected={activeTab === 'widget'}
                      aria-controls="ai-chat-tab-widget-panel"
                      tabIndex={activeTab === 'widget' ? 0 : -1}
                      onClick={() => setActiveTab('widget')}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        activeTab === 'widget'
                          ? 'bg-teal-100 font-semibold text-teal-950 ring-1 ring-teal-200/90'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <PanelRightOpen className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <span className="truncate">Widget</span>
                      </span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 ${activeTab === 'widget' ? 'text-teal-600 opacity-90' : 'opacity-35'}`}
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      role="tab"
                      id="ai-chat-tab-knowledge-trigger"
                      aria-selected={activeTab === 'knowledge'}
                      aria-controls="ai-chat-tab-knowledge-panel"
                      tabIndex={activeTab === 'knowledge' ? 0 : -1}
                      onClick={() => setActiveTab('knowledge')}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        activeTab === 'knowledge'
                          ? 'bg-teal-100 font-semibold text-teal-950 ring-1 ring-teal-200/90'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Library className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                        <span className="truncate">Knowledge base</span>
                      </span>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 ${activeTab === 'knowledge' ? 'text-teal-600 opacity-90' : 'opacity-35'}`}
                        aria-hidden
                      />
                    </button>
                  </nav>
                </div>
              </aside>

              {/* Mobile segment control */}
              <div
                className="flex flex-wrap gap-1.5 border-b border-gray-100 bg-gray-50/50 p-3 lg:hidden"
                role="tablist"
                aria-label="AI chat settings sections"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'widget'}
                  aria-controls="ai-chat-tab-widget-panel"
                  tabIndex={activeTab === 'widget' ? 0 : -1}
                  onClick={() => setActiveTab('widget')}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold leading-tight transition-colors ${
                    activeTab === 'widget'
                      ? 'border-teal-500 bg-teal-50 text-teal-950'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200 hover:bg-teal-50/40'
                  }`}
                >
                  <PanelRightOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Widget
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'knowledge'}
                  aria-controls="ai-chat-tab-knowledge-panel"
                  tabIndex={activeTab === 'knowledge' ? 0 : -1}
                  onClick={() => setActiveTab('knowledge')}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold leading-tight transition-colors ${
                    activeTab === 'knowledge'
                      ? 'border-teal-500 bg-teal-50 text-teal-950'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200 hover:bg-teal-50/40'
                  }`}
                >
                  <Library className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Knowledge base
                </button>
              </div>

              <div className="min-w-0 p-4 sm:p-6 lg:min-h-[320px]">
                <div
                  role="tabpanel"
                  id="ai-chat-tab-widget-panel"
                  aria-labelledby="ai-chat-tab-widget-trigger"
                  hidden={activeTab !== 'widget'}
                >
                  <LandingChatWidgetSettings />
                </div>

                <div
                  role="tabpanel"
                  id="ai-chat-tab-knowledge-panel"
                  aria-labelledby="ai-chat-tab-knowledge-trigger"
                  hidden={activeTab !== 'knowledge'}
                >
                  <LandingKnowledgeBaseEditor />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    </ProtectedRoute>
  );
}
