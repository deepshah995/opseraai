"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar, NavTab } from "@/components/layout/Sidebar";
import { DashboardView } from "@/features/dashboard/DashboardView";
import { ExceptionListView } from "@/features/exceptions/ExceptionListView";
import { InvestigationDetailView } from "@/features/investigations/InvestigationDetailView";
import { ApprovalsView } from "@/features/approvals/ApprovalsView";
import { DataIngestionView } from "@/features/documents/DataIngestionView";
import { RecordsListView } from "@/features/records/RecordsListView";
import { AuditTrailView } from "@/features/audit/AuditTrailView";
import { SettingsView } from "@/features/settings/SettingsView";
import { AgentsHubView } from "@/features/agents/AgentsHubView";
import { ReportingAgentView } from "@/features/reporting/ReportingAgentView";
import { TourWelcomeModal } from "@/components/walkthrough/TourWelcomeModal";
import { OperationsTour } from "@/components/walkthrough/OperationsTour";

import { 
  AnalyticsSummary, 
  ExceptionStats, 
  OperationalException, 
  InvestigationDetail, 
  Approval, 
  OperationalRecord, 
  SourceDocument, 
  AuditEvent 
} from "@/types";
import { api } from "@/lib/api/client";

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);

  // Tour States
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Data states
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [stats, setStats] = useState<ExceptionStats | null>(null);
  const [exceptions, setExceptions] = useState<OperationalException[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [records, setRecords] = useState<OperationalRecord[]>([]);
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [currentInvestigation, setCurrentInvestigation] = useState<InvestigationDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);

  const handleTabChange = useCallback((tab: NavTab) => {
    setCurrentTab(tab);
    if (typeof window !== "undefined") {
      window.location.hash = tab;
    }
    if (tab !== "exceptions") {
      setSelectedExceptionId(null);
    }
    setIsWelcomeModalOpen(false);
  }, []);

  // Sync tab from URL hash on mount and on hash changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const applyHash = () => {
        const hash = window.location.hash.replace("#", "");
        const validTabs: NavTab[] = ["dashboard", "agents", "studio", "reports", "minions", "exceptions", "approvals", "ingestion", "records", "audit", "settings"];
        if (hash && validTabs.includes(hash as NavTab)) {
          setCurrentTab(hash as NavTab);
          setIsWelcomeModalOpen(false);
          if (hash !== "exceptions") {
            setSelectedExceptionId(null);
          }
        }
      };
      applyHash();
      window.addEventListener("hashchange", applyHash);
      return () => window.removeEventListener("hashchange", applyHash);
    }
  }, []);

  // Auto-launch tour welcome modal on first visit (only when on default dashboard without specific deep-link)
  useEffect(() => {
    try {
      const hasSeen = localStorage.getItem("ops_tour_seen");
      const hasHash = typeof window !== "undefined" && window.location.hash && window.location.hash !== "#dashboard";
      if (!hasSeen && !hasHash) {
        setIsWelcomeModalOpen(true);
      }
    } catch (_) {}
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        summaryRes,
        statsRes,
        exceptionsRes,
        approvalsRes,
        recordsRes,
        documentsRes,
        auditRes,
      ] = await Promise.all([
        api.getAnalyticsSummary().catch(() => null),
        api.getExceptionStats().catch(() => null),
        api.listExceptions().catch(() => []),
        api.listApprovals().catch(() => []),
        api.listRecords().catch(() => []),
        api.listDocuments().catch(() => []),
        api.listAuditEvents().catch(() => []),
      ]);

      setSummary(summaryRes);
      setStats(statsRes);
      setExceptions(exceptionsRes);
      setApprovals(approvalsRes);
      setRecords(recordsRes);
      setDocuments(documentsRes);
      setAuditEvents(auditRes);
    } catch (e) {
      console.error("Data load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load investigation detail when an exception is selected
  useEffect(() => {
    if (!selectedExceptionId) {
      setCurrentInvestigation(null);
      return;
    }
    api
      .getInvestigationByException(selectedExceptionId)
      .then((inv) => setCurrentInvestigation(inv))
      .catch(() => setCurrentInvestigation(null));
  }, [selectedExceptionId]);

  const handleSelectException = (id: string) => {
    setSelectedExceptionId(id);
    setCurrentTab("exceptions");
  };

  const handleTriggerInvestigation = async (exceptionId: string) => {
    try {
      setInvestigatingId(exceptionId);
      const inv = await api.triggerInvestigation(exceptionId);
      setSelectedExceptionId(exceptionId);
      setCurrentInvestigation(inv);
      await loadData();
    } catch (e: any) {
      alert(`Investigation trigger failed: ${e.message}`);
    } finally {
      setInvestigatingId(null);
    }
  };

  const selectedException = exceptions.find((e) => e.id === selectedExceptionId) || null;
  const pendingApprovalsCount = approvals.filter((a) => a.decision === "pending").length;
  const openExceptionsCount = exceptions.filter((e) => e.status === "open" || e.status === "awaiting_approval").length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Navbar 
        onRefresh={loadData}
        onStartTour={() => setIsWelcomeModalOpen(true)}
        onSeed={async () => {
          await api.seedDemoData(true);
          await loadData();
        }}
        onDetect={async () => {
          await api.runExceptionDetection();
          await loadData();
        }}
      />

      <div className="flex flex-1">
        <Sidebar
          currentTab={currentTab}
          onTabChange={handleTabChange}
          openExceptionsCount={openExceptionsCount}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          {currentTab === "dashboard" && (
            <DashboardView
              summary={summary}
              stats={stats}
              auditEvents={auditEvents}
              onNavigate={handleTabChange}
              onSelectException={handleSelectException}
            />
          )}

          {currentTab === "agents" && (
            <AgentsHubView
              summary={summary}
              exceptions={exceptions}
              onRefreshData={loadData}
              onSelectException={handleSelectException}
              initialSelectedAgentId={selectedAgentId}
              onNavigateToReports={() => handleTabChange("reports")}
            />
          )}

          {(currentTab === "studio" || currentTab === "minions") && (
            <AgentsHubView
              summary={summary}
              exceptions={exceptions}
              onRefreshData={loadData}
              onSelectException={handleSelectException}
              initialSelectedAgentId={selectedAgentId}
              initialTab="studio"
              onNavigateToReports={() => handleTabChange("reports")}
            />
          )}

          {currentTab === "reports" && (
            <ReportingAgentView
              onNavigateToConsole={(agId) => {
                setSelectedAgentId(agId);
                handleTabChange("agents");
              }}
              onNavigateToExceptions={() => {
                handleTabChange("exceptions");
              }}
            />
          )}

          {currentTab === "exceptions" && (
            <>
              {selectedException ? (
                <InvestigationDetailView
                  exception={selectedException}
                  investigation={currentInvestigation}
                  onBack={() => setSelectedExceptionId(null)}
                  onRefresh={() => {
                    loadData();
                    if (selectedExceptionId) {
                      api.getInvestigationByException(selectedExceptionId).then(setCurrentInvestigation).catch(() => {});
                    }
                  }}
                />
              ) : (
                <ExceptionListView
                  exceptions={exceptions}
                  loading={loading}
                  onSelectException={handleSelectException}
                  onTriggerInvestigation={handleTriggerInvestigation}
                  investigatingId={investigatingId}
                />
              )}
            </>
          )}

          {currentTab === "approvals" && (
            <ApprovalsView
              approvals={approvals}
              onRefresh={loadData}
              onSelectException={handleSelectException}
            />
          )}

          {currentTab === "ingestion" && (
            <DataIngestionView
              documents={documents}
              onRefresh={loadData}
            />
          )}

          {currentTab === "records" && (
            <RecordsListView records={records} />
          )}

          {currentTab === "audit" && (
            <AuditTrailView events={auditEvents} />
          )}

          {currentTab === "settings" && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Interactive Tour Welcome Modal */}
      <TourWelcomeModal
        isOpen={isWelcomeModalOpen}
        onClose={() => {
          setIsWelcomeModalOpen(false);
          try { localStorage.setItem("ops_tour_seen", "true"); } catch (_) {}
        }}
        onStartTour={() => {
          setIsWelcomeModalOpen(false);
          setIsTourOpen(true);
          try { localStorage.setItem("ops_tour_seen", "true"); } catch (_) {}
        }}
      />

      {/* Interactive Floating Tour Controller & Spotlight */}
      <OperationsTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        setActiveTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== "exceptions") {
            setSelectedExceptionId(null);
          }
        }}
        onSelectException={handleSelectException}
        exceptions={exceptions}
        onSeedData={async () => {
          await api.seedDemoData(true);
          await loadData();
        }}
        onRunDetection={async () => {
          await api.runExceptionDetection();
          await loadData();
        }}
      />
    </div>
  );
}
