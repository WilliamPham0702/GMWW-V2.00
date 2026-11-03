/**
 * Phase 4A/4B: LOCAL synthetic-only recovery readiness assessment.
 * This module NEVER reads credentials or Cloudflare resources, never writes
 * Production storage, never routes traffic, and never enables failover.
 * Evidence supplied to this pure function must be verified by the caller.
 */
import {STANDBY_SCHEMA} from './fixture-contract.mjs';

const HEX40=/^[a-f0-9]{40}$/;
const HEX64=/^[a-f0-9]{64}$/;
const SAFE_PHASES=new Set(['lobby','setup','ended']);

export function assessStage4SyntheticRecovery(evidence={}){
  const blockers=[];
  const deny=(condition,code)=>{if(condition)blockers.push(code)};
  deny(evidence?.fixtureOnly!==true,'FIXTURE_ONLY_REQUIRED');
  deny(evidence?.sourceAccount!=='synthetic-A'||evidence?.targetAccount!=='synthetic-B',
    'ISOLATED_ACCOUNT_PAIR_REQUIRED');
  deny(evidence?.realProductionDataConnected!==false,'PRODUCTION_DATA_MUST_BE_DISCONNECTED');
  deny(evidence?.schemaVersion!==STANDBY_SCHEMA,'SYNTHETIC_SCHEMA_MISMATCH');
  deny(typeof evidence?.sourceSha!=='string'||!HEX40.test(evidence.sourceSha)||
    evidence.sourceSha!==evidence.targetSha,'CODE_COMMIT_MISMATCH');
  deny(typeof evidence?.checkpointSha256!=='string'||!HEX64.test(evidence.checkpointSha256),
    'SIGNED_CHECKPOINT_REQUIRED');
  deny(evidence?.checkpointVerified!==true,'CHECKPOINT_NOT_VERIFIED');
  deny(evidence?.restoreDryRunVerified!==true,'RESTORE_DRY_RUN_NOT_VERIFIED');
  deny(evidence?.restoredChecksumMatches!==true,'RESTORED_CHECKSUM_MISMATCH');
  deny(evidence?.activeMatch!==false||!SAFE_PHASES.has(evidence.phase),
    'MATCH_MUST_BE_INACTIVE');
  deny(evidence?.connectedSockets!==0,'SOCKETS_MUST_BE_DISCONNECTED');

  return Object.freeze({
    environment:'synthetic-fixture-local-only',
    syntheticRestoreReady:blockers.length===0,
    productionSwitchAllowed:false,
    failoverReady:false,
    realBackupVerified:false,
    blockers:Object.freeze(blockers),
    requiresSeparateApprovals:Object.freeze([
      'PRODUCTION_CREDENTIAL_MIGRATION_AND_ROTATION',
      'LIVE_DATA_EXPORT_AND_ENCRYPTED_BACKUP',
      'REAL_DO_CROSS_ACCOUNT_RESTORE',
      'FULL_GAME_SESSION_AND_HISTORY_PARITY',
      'PAGES_HOSTNAME_AND_TRAFFIC_CUTOVER',
      'LIVE_FAILOVER_AND_ROLLBACK'
    ])
  });
}
