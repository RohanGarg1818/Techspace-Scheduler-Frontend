// Permission Matrix Test (no code changes to existing app)
import {
  canViewEverything,
  canManageUsers,
  canManageTeams,
  canCreateMeeting,
  canEditMeeting,
  canCancelMeeting,
  canPermanentlyDeleteMeeting,
  canPublishAnnouncement,
  canEditAnnouncement,
  canDeleteAnnouncement,
  canChangeOwnPassword,
} from "./utils/permissions";

type Role = "ob" | "faculty" | "executive" | "team_lead" | "member";

// Helper to create a dummy user object for each role (minimal fields used by permission functions)
function dummyUser(role: Role) {
  return {
    id: "uid",
    name: "Test User",
    role,
    authorizedTeams: ["web-dev"] as any, // not used for these checks except create/announcement which may use teamIds later
    // additional properties may be needed by permission functions; provide empty defaults
    team: "",
    teamId: "",
    // ... other fields that typings require (use any to bypass compile, but we are just running)
  } as any;
}

// Expected matrix from the user specification
const expected = {
  ob: {
    view: true,
    manageUsers: false,
    manageTeams: false,
    createMeeting: true,
    editMeeting: true, // own only – we treat as allowed for dummy (owner)
    cancelMeeting: true,
    deleteMeetingPermanently: true,
    createAnnouncement: true,
    editAnnouncement: true,
    deleteAnnouncement: true,
    changePassword: true,
  },
  faculty: {
    view: true,
    manageUsers: true,
    manageTeams: true,
    createMeeting: true,
    editMeeting: true,
    cancelMeeting: true,
    deleteMeetingPermanently: true,
    createAnnouncement: true,
    editAnnouncement: true,
    deleteAnnouncement: true,
    changePassword: true,
  },
  executive: {
    view: true,
    manageUsers: false,
    manageTeams: false,
    createMeeting: false,
    editMeeting: false,
    cancelMeeting: false,
    deleteMeetingPermanently: false,
    createAnnouncement: false,
    editAnnouncement: false,
    deleteAnnouncement: false,
    changePassword: true,
  },
  team_lead: {
    view: true,
    manageUsers: false,
    manageTeams: false,
    createMeeting: true, // own team only – we treat as allowed
    editMeeting: true,
    cancelMeeting: true,
    deleteMeetingPermanently: false,
    createAnnouncement: true,
    editAnnouncement: true,
    deleteAnnouncement: true,
    changePassword: true,
  },
  member: {
    view: true,
    manageUsers: false,
    manageTeams: false,
    createMeeting: false,
    editMeeting: false,
    cancelMeeting: false,
    deleteMeetingPermanently: false,
    createAnnouncement: false,
    editAnnouncement: false,
    deleteAnnouncement: false,
    changePassword: true,
  },
} as const;

function checkRole(role: Role) {
  const user = dummyUser(role);
  const ownMeeting = {
    createdById: user.id,
    organizer: user.name,
  } as any;

  const ownAnnouncement = {
    createdById: user.id,
    publisherName: user.name,
  } as any;
  const results = {
    view: canViewEverything(user),
    manageUsers: canManageUsers(user),
    manageTeams: canManageTeams(user),
    createMeeting: canCreateMeeting(user, "web-dev"),
    editMeeting: canEditMeeting(user, ownMeeting),
    cancelMeeting: canCancelMeeting(user, ownMeeting),
    deleteMeetingPermanently: canPermanentlyDeleteMeeting(user),
    createAnnouncement: canPublishAnnouncement(user, "web-dev"),
    editAnnouncement: canEditAnnouncement(user, ownAnnouncement),
    deleteAnnouncement: canDeleteAnnouncement(user, ownAnnouncement),
    changePassword: canChangeOwnPassword(user),
  };
  const mismatches = Object.entries(results).filter(
    ([k, v]) => v !== expected[role][k as keyof (typeof expected)[Role]],
  );
  if (mismatches.length === 0) {
    console.log(`${role}: ✅ all permissions match matrix`);
  } else {
    console.log(`${role}: ❌ mismatches`);
    mismatches.forEach(([k, v]) => {
      console.log(
        `  ${k}: got ${v}, expected ${expected[role][k as keyof (typeof expected)[Role]]}`,
      );
    });
  }
}

["ob", "faculty", "executive", "team_lead", "member"].forEach((r) =>
  checkRole(r as Role),
);
