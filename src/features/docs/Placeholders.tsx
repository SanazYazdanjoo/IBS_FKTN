/**
 * Placeholder pages for features that are not yet built, as well as the
 * documentation page.
 *
 * These are intentionally visible as menu items and not hidden: the planned
 * scope remains visible to all stakeholders. To ensure no one mistakes them
 * for finished features, the navigation entries are displayed in a subdued
 * style.
 */
import { useEffect, useState } from 'react';
import { Card, SecondaryButton } from '../../app/ui';

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-display)]">{title}</h1>
      </div>
      <Card>
        <p className="text-sm text-ink-dim">to be implemented</p>
      </Card>
    </div>
  );
}

export function AutoReminderEmails() {
  return <Placeholder title="Auto-Reminder Emails" />;
}

type DocSection = {
  id: string;
  title: string;
  content: { heading: string; text: string }[];
};

const DOC_STORAGE_KEY = 'app-documentation-content';

const defaultDocs: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview & Quick Start',
    content: [
      {
        heading: 'Application Purpose',
        text: 'A functional prototype for digitalizing the travel-cost reimbursement workflow. Built as part of an HCI research project, this application covers the process from submission by a participant (TN) to final approval.',
      },
      {
        heading: 'Role Breakdown',
        text: 'The system is built for five roles: TN (Teilnehmer), Dozent, Manager, Admin, and Accounting. Each role has a specific login and access to tasks relevant to their part in the workflow.',
      },
      {
        heading: 'Quick Start Commands',
        text: 'To get the application running locally, use the following commands:\n`npm install` - to install dependencies.\n`npm test` - to run the full test suite.\n`npm run dev` - to start the development server.',
      },
    ],
  },
  {
    id: 'tn-workflow',
    title: 'Participant & Submission Workflow',
    content: [
      {
        heading: 'Guided Step-by-Step Mode',
        text: 'For participants with lower digital literacy, a guided "Schritt-für-Schritt" mode is available. This simplifies the submission process into a series of clear, single-action steps.',
      },
      {
        heading: 'Localization',
        text: 'The participant (TN) flow supports multiple languages (currently German and English) to accommodate users with language barriers. The language can be switched directly in the UI.',
      },
      {
        heading: 'Mobile Camera Capture',
        text: 'Participants can use their device camera to capture and upload required documents like tickets and certificates directly within the application, streamlining the proof submission process.',
      },
    ],
  },
  {
    id: 'admin-ops',
    title: 'Admin & Course Operations',
    content: [
      {
        heading: 'Attendance Legend Rules',
        text: 'The rules for which attendance marks (E, K, X, etc.) count as reimbursable are encoded in `src/domain/rules.ts`. This logic is configurable to handle historical variations in interpretation.',
      },
      {
        heading: 'Formula Trace',
        text: 'Every reimbursement calculation provides a full trace, ensuring transparency. The UI for TNs, Admins, and Managers shows the exact same numbers derived from the same pure-function computation.',
      },
      {
        heading: 'Live VMT Comparison Engine',
        text: 'The "Vergleichsrechnung" screen includes a live editor for VMT single fares, replacing manual per-case lookups. Changes are reflected instantly across the application.',
      },
    ],
  },
  {
    id: 'approvals',
    title: 'Approval Chain & Management',
    content: [
      {
        heading: 'Digital Hand-offs',
        text: 'The workflow is designed for fully digital hand-offs between roles, from TN submission to Manager and Accounting approval, reducing paper-based processes.',
      },
      {
        heading: 'Signature Modes',
        text: 'The application supports both paper-based (Modus A) and digital (Modus B) signatures. Modus B is implemented but pending a final ruling from finance and data protection officers.',
      },
      {
        heading: 'Deputy Rules',
        text: 'The system includes a configurable rule for activating a deputy if a manager is absent for a specified number of days. The rule is displayed, but automation is pending integration with a real "away" status.',
      },
    ],
  },
  {
    id: 'data-protection',
    title: 'Data Protection & Logging',
    content: [
      {
        heading: 'Pseudonymous Analytics',
        text: 'The app features a local-only, pseudonymous event log to measure process metrics like cycle times and error rates. No PII is ever recorded, and all identifiers are salted and hashed.',
      },
      {
        heading: 'Local Storage Safeguards',
        text: 'All data, including participant information and event logs, is stored locally in the browser (IndexedDB, localStorage). No data is transmitted to any external server, ensuring DSGVO compliance.',
      },
      {
        heading: 'Retention Policies',
        text: 'The event log has a 90-day retention policy. Older data is automatically pruned. Users can also export or delete their log data at any time from the settings menu.',
      },
    ],
  },
  {
    id: 'architecture',
    title: 'File Architecture & Storage',
    content: [
      {
        heading: 'Adapter-based Persistence',
        text: 'Persistence logic is abstracted behind a `StorageAdapter`. The app ships with a mock adapter for demo data and an Excel adapter that can read/write to a single file or a folder with automatic backups.',
      },
      {
        heading: 'Data Isolation',
        text: 'Access control is enforced at the adapter level, not in the UI. A user can only query their own records; attempting to access others\' data throws an `AccessDeniedError`.',
      },
      {
        heading: 'Demo Data Generation',
        text: 'The mock seed data is generated from committed demo Excel workbooks via `npm run seed:build`. This ensures the demo data perfectly mirrors the structure of live-loaded data.',
      },
    ],
  },
];

export function Documentation() {
  const [docs, setDocs] = useState<DocSection[]>(defaultDocs);
  const [activeSectionId, setActiveSectionId] = useState(defaultDocs[0].id);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    try {
      // Attempt to load customized docs from localStorage
      const storedDocs = localStorage.getItem(DOC_STORAGE_KEY);
      if (storedDocs) {
        setDocs(JSON.parse(storedDocs));
      }
    } catch (error) {
      console.error('Failed to load documentation from localStorage', error);
      setDocs(defaultDocs);
    }
  }, []);

  useEffect(() => {
    try {
      // Persist any edits to localStorage
      localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify(docs));
    } catch (error) {
      console.error('Failed to save documentation to localStorage', error);
    }
  }, [docs]);

  const handleContentChange = (sectionIndex: number, contentIndex: number, newText: string) => {
    const newDocs = [...docs];
    newDocs[sectionIndex].content[contentIndex].text = newText;
    setDocs(newDocs);
  };

  const lowerCaseQuery = searchQuery.toLowerCase();
  const filteredDocs =
    searchQuery.trim() === ''
      ? docs
      : docs.filter(
          (section) =>
            section.title.toLowerCase().includes(lowerCaseQuery) ||
            section.content.some(
              (item) =>
                item.heading.toLowerCase().includes(lowerCaseQuery) ||
                item.text.toLowerCase().includes(lowerCaseQuery),
            ),
        );

  // If the active section is filtered out, select the first available one.
  useEffect(() => {
    if (filteredDocs.length > 0 && !filteredDocs.find((d) => d.id === activeSectionId)) {
      setActiveSectionId(filteredDocs[0].id);
    }
  }, [searchQuery, activeSectionId, filteredDocs]);

  const activeSection = filteredDocs.find((s) => s.id === activeSectionId) ?? filteredDocs[0];
  const activeSectionIndex = docs.findIndex((s) => s.id === activeSection.id);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return text;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-highlight/70 px-0.5 py-0 rounded-sm">
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[var(--text-display)]">
          In-App Documentation
        </h1>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 rounded-md border border-stroke bg-surface px-3 py-1.5 text-sm focus:border-primary focus:ring-primary/40"
          />
          <SecondaryButton
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 text-xs"
            logId="docs.toggle-edit"
          >
            {isEditing ? 'Save & View' : 'Edit Documentation'}
          </SecondaryButton>
        </div>
      </div>

      <Card>
        <div className="flex gap-8">
          <nav className="w-1/4 flex-shrink-0">
            <ul className="space-y-1 font-medium">
              {filteredDocs.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => setActiveSectionId(section.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      activeSectionId === section.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-ink hover:bg-muted'
                    }`}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
              {filteredDocs.length === 0 && (
                <li className="px-3 py-2 text-sm text-ink-dim">No results found.</li>
              )}
            </ul>
          </nav>

          <main className="w-3/4 border-l border-line pl-8">
            {activeSection ? (
              <div className="space-y-6">
                <h2 className="font-display text-xl font-semibold text-ink-display">
                  {activeSection.title}
                </h2>
                {activeSection.content.map((item, contentIndex) => (
                  <div key={contentIndex} className="space-y-2">
                    <h3 className="font-semibold text-ink">
                      {highlightText(item.heading, searchQuery)}
                    </h3>
                    {isEditing ? (
                      <textarea
                        value={item.text}
                        onChange={(e) =>
                          handleContentChange(activeSectionIndex, contentIndex, e.target.value)
                        }
                        className="font-body w-full rounded-md border border-stroke bg-surface p-2 text-sm text-ink-dim focus:border-primary focus:ring-primary/40"
                        rows={Math.max(3, item.text.split('\n').length + 1)}
                      />
                    ) : (
                      <p className="font-body whitespace-pre-wrap text-sm text-ink-dim">
                        {highlightText(item.text, searchQuery)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              searchQuery && (
                <p className="text-sm text-ink-dim">
                  Select a section from the left to view its content.
                </p>
              )
            )}
          </main>
        </div>
      </Card>
    </div>
  );
}
