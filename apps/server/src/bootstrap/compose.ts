import {
  composeClients,
  type ClientRepository,
  type ClientsApi,
} from '@repo/core'

export interface ServerClientsGraph {
  clients: ClientsApi
}

export function composeServerClients(
  repo: ClientRepository
): ServerClientsGraph {
  return { clients: composeClients(repo) }
}
