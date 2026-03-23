import mongoose from 'mongoose'

const MONGODB_URL =
  process.env.MONGODB_URL ?? 'mongodb://localhost:27017/bens-chat'

async function generateUniqueName(
  db: mongoose.Connection,
  tenantId: string,
  baseName: string
): Promise<string> {
  const aiAgents = db.collection('aiagents')
  let name = baseName
  let counter = 1

  while (await aiAgents.findOne({ tenantId, name })) {
    counter++
    const suffix = ` (${counter})`
    name =
      baseName.length + suffix.length > 100
        ? baseName.slice(0, 100 - suffix.length) + suffix
        : baseName + suffix
  }

  return name
}

async function migrate(): Promise<void> {
  const conn = await mongoose.connect(MONGODB_URL)
  const db = conn.connection
  const aiAgents = db.collection('aiagents')
  const channels = db.collection('channels')

  console.warn('Starting AI agents migration...')

  // Passo 1: Generate names
  const agentsWithoutName = await aiAgents
    .find({ name: { $exists: false } })
    .toArray()
  console.warn(`Passo 1: ${agentsWithoutName.length} agents need names`)

  for (const agent of agentsWithoutName) {
    const channelId = agent.channelId
    const channel = channelId
      ? await channels.findOne({ _id: new mongoose.Types.ObjectId(channelId) })
      : null

    const baseName = channel
      ? `Agente - ${channel.name}`
      : `Agente orfao - ${String(channelId ?? agent._id).substring(0, 8)}`

    const name = await generateUniqueName(db, agent.tenantId, baseName)

    await aiAgents.updateOne(
      { _id: agent._id },
      { $set: { name, description: null } }
    )
    console.warn(`  Named agent ${String(agent._id)} -> "${name}"`)
  }

  // Passo 2: Link channels
  const agentsWithChannelId = await aiAgents
    .find({ channelId: { $exists: true, $ne: null } })
    .toArray()
  console.warn(`Passo 2: ${agentsWithChannelId.length} agents to link`)

  let linkErrors = 0
  for (const agent of agentsWithChannelId) {
    const channelId = agent.channelId
    const channel = await channels.findOne({
      _id: new mongoose.Types.ObjectId(channelId),
    })

    if (!channel) {
      console.warn(
        `  Channel ${channelId} not found for agent ${String(agent._id)} (orphan)`
      )
      continue
    }

    if (channel.aiAgentId) {
      console.warn(`  Channel ${channelId} already linked, skipping`)
      continue
    }

    const result = await channels.updateOne(
      { _id: channel._id },
      { $set: { aiAgentId: String(agent._id) } }
    )

    if (result.modifiedCount === 0) {
      console.error(
        `  Failed to link agent ${String(agent._id)} to channel ${channelId}`
      )
      linkErrors++
    } else {
      console.warn(
        `  Linked agent ${String(agent._id)} to channel ${channelId}`
      )
    }
  }

  if (linkErrors > 0) {
    console.error(`Passo 2 had ${linkErrors} errors. Stopping before Passo 3.`)
    await mongoose.disconnect()
    process.exit(1)
  }

  // Passo 3: Cleanup
  console.warn('Passo 3: Removing channelId and updating indexes')

  await aiAgents.updateMany(
    { channelId: { $exists: true } },
    { $unset: { channelId: '' } }
  )

  try {
    await aiAgents.dropIndex('tenantId_1_channelId_1')
    console.warn('  Dropped old index')
  } catch {
    console.warn('  Old index not found (already removed)')
  }

  try {
    await aiAgents.createIndex({ tenantId: 1, name: 1 }, { unique: true })
    console.warn('  Created new unique index')
  } catch {
    console.warn('  New index already exists')
  }

  console.warn('Migration complete!')
  await mongoose.disconnect()
}

migrate().catch((err: unknown) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
