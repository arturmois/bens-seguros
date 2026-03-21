import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { Role } from './roles.js';

type Action = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'approve';
type Subject =
  | 'all'
  | 'User'
  | 'Organization'
  | 'Client'
  | 'Proposal'
  | 'Policy'
  | 'Claim'
  | 'Commission'
  | 'Endorsement'
  | 'Assistance'
  | 'Document'
  | 'AuditLog'
  | 'Notification';

export type AppAbility = MongoAbility<[Action, Subject]>;

const OPERATIONAL_SUBJECTS: Subject[] = [
  'Client',
  'Proposal',
  'Policy',
  'Claim',
  'Endorsement',
  'Assistance',
  'Document',
];

export function defineAbilitiesFor(role: Role): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (role) {
    case 'OWNER':
      can('manage', 'all');
      break;

    case 'ADMIN':
      can('manage', OPERATIONAL_SUBJECTS);
      can('manage', 'Commission');
      can('approve', 'Commission');
      can('manage', 'User');
      can('manage', 'Notification');
      can('read', 'AuditLog');
      break;

    case 'MANAGER':
      can('manage', OPERATIONAL_SUBJECTS);
      can('manage', 'Commission');
      can('approve', 'Commission');
      can('read', 'Notification');
      can('read', 'AuditLog');
      break;

    case 'COMMERCIAL':
      can(['create', 'read', 'update'], ['Client', 'Proposal']);
      can('read', ['Policy', 'Commission', 'Claim', 'Document']);
      can('read', 'Notification');
      break;

    case 'VIEWER':
      can('read', OPERATIONAL_SUBJECTS);
      can('read', ['Commission', 'Notification']);
      break;
  }

  return build();
}
