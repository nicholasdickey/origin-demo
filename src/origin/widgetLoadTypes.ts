/** Shared types for widgetLoadInternalData structured content (browser + server). */

export type ArchiveThread = {
  id: string;
  state: string;
  data: string;
  waitingOn: string;
};

export type ArchiveProject = {
  id: string;
  title: string;
  status: string;
  threads: ArchiveThread[];
};

export type OriginUserInfo = {
  portalLink: string | null;
  loginLink: string | null;
  isAnon: boolean;
  isAnonymousPlan?: boolean;
  userName: string | null;
  totalChats?: number;
  remainingSlots?: number;
};

export type WidgetLoadStructuredContent =
  | {
      surface: "dashboard";
      projects: ArchiveProject[];
    }
  | {
      surface: "familyLogin";
      message: string;
    }
  | {
      surface: "emailApproval";
      message: string;
    };
