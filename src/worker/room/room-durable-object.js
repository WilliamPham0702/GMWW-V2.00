// Lớp Durable Object của phòng: chỉ khai báo và ghép các nhóm phương thức.
import { DurableObject } from "cloudflare:workers";
import { installRoomMethods } from "./compose.js";
import { RoomHttpDispatchMethods } from "./http-dispatch.js";
import { RoomAvatarMethods } from "./avatars.js";
import { RoomMemberMethods } from "./members.js";
import { RoomVillageMethods } from "./village.js";
import { RoomGameTemplateMethods } from "./game-templates.js";
import { RoomSharedAssetMethods } from "./shared-assets.js";
import { RoomMemberAdminMethods } from "./member-admin.js";
import { RoomMatchHistoryMethods } from "./match-history.js";
import { RoomSceneSettingsMethods } from "./scene-settings.js";
import { RoomGlobalSettingsMethods } from "./global-settings.js";
import { RoomDirectoryMethods } from "./room-directory.js";
import { RoomPlayerRoomMethods } from "./player-rooms.js";
import { RoomMatchStateMethods } from "./match-state.js";
import { RoomGallowsMethods } from "./gallows.js";
import { RoomPlayerPhaseMethods } from "./player-phase.js";
import { RoomGmStateMethods } from "./gm-state.js";
import { RoomAnnouncementMethods } from "./announcements.js";
import { RoomRoleArtworkMethods } from "./role-artwork.js";
import { RoomGmMatchSetupMethods } from "./gm-match-setup.js";
import { RoomDemoAutoMethods } from "./demo-and-auto.js";
import { RoomGmRoomControlMethods } from "./gm-room-control.js";
import { RoomExpiryMethods } from "./room-expiry.js";
import { RoomNightRuntimeMethods } from "./night-runtime.js";
import { RoomCycleMethods } from "./cycle.js";
import { RoomArtifactMethods } from "./artifacts.js";
import { RoomDayActionMethods } from "./day-actions.js";
import { RoomBattleActionMethods } from "./battle-actions.js";
import { RoomInteractionMethods } from "./interactions.js";
import { RoomLifecycleMethods } from "./lifecycle.js";
import { RoomPlayerStateMethods } from "./player-state.js";
import { RoomPlayerActionMethods } from "./player-actions.js";
import { RoomPlayerSeatMethods } from "./player-seats.js";
import { RoomPresenceMethods } from "./presence.js";
import { RoomChatMethods } from "./chat.js";
import { RoomRealtimeMethods } from "./realtime.js";

export class RoomDurableObject extends DurableObject {}

installRoomMethods(RoomDurableObject, [
  RoomHttpDispatchMethods,
  RoomAvatarMethods,
  RoomMemberMethods,
  RoomVillageMethods,
  RoomGameTemplateMethods,
  RoomSharedAssetMethods,
  RoomMemberAdminMethods,
  RoomMatchHistoryMethods,
  RoomSceneSettingsMethods,
  RoomGlobalSettingsMethods,
  RoomDirectoryMethods,
  RoomPlayerRoomMethods,
  RoomMatchStateMethods,
  RoomGallowsMethods,
  RoomPlayerPhaseMethods,
  RoomGmStateMethods,
  RoomAnnouncementMethods,
  RoomRoleArtworkMethods,
  RoomGmMatchSetupMethods,
  RoomDemoAutoMethods,
  RoomGmRoomControlMethods,
  RoomExpiryMethods,
  RoomNightRuntimeMethods,
  RoomCycleMethods,
  RoomArtifactMethods,
  RoomDayActionMethods,
  RoomBattleActionMethods,
  RoomInteractionMethods,
  RoomLifecycleMethods,
  RoomPlayerStateMethods,
  RoomPlayerActionMethods,
  RoomPlayerSeatMethods,
  RoomPresenceMethods,
  RoomChatMethods,
  RoomRealtimeMethods,
]);
