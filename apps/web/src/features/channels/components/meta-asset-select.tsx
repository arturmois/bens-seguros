'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Radio, RadioGroup } from '@/components/ui/radio-group'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import type { MetaAsset } from '../types'

interface ConnectInput {
  readonly pageId: string
  readonly name: string
  readonly channelType: 'MESSENGER' | 'INSTAGRAM'
  readonly instagramAccountId?: string
}

interface MetaAssetSelectProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly assets: MetaAsset[]
  readonly channelType: 'MESSENGER' | 'INSTAGRAM'
  readonly onConnect: (input: ConnectInput) => void
  readonly onCancel: () => void
}

function buildDefaultName(
  pageName: string,
  channelType: 'MESSENGER' | 'INSTAGRAM'
): string {
  const suffix = channelType === 'MESSENGER' ? ' — Messenger' : ' — Instagram'
  return `${pageName}${suffix}`
}

export function MetaAssetSelect({
  open,
  onOpenChange,
  assets,
  channelType,
  onConnect,
  onCancel,
}: MetaAssetSelectProps) {
  const visibleAssets =
    channelType === 'INSTAGRAM' ? assets.filter((a) => a.hasInstagram) : assets

  const firstAsset = visibleAssets[0]
  const [selectedPageId, setSelectedPageId] = useState<string>(
    firstAsset?.pageId ?? ''
  )
  const [channelName, setChannelName] = useState<string>(
    firstAsset ? buildDefaultName(firstAsset.pageName, channelType) : ''
  )

  function handlePageSelect(pageId: string) {
    setSelectedPageId(pageId)
    const asset = visibleAssets.find((a) => a.pageId === pageId)
    if (asset) {
      setChannelName(buildDefaultName(asset.pageName, channelType))
    }
  }

  function handleConnect() {
    const asset = visibleAssets.find((a) => a.pageId === selectedPageId)
    if (!asset) return

    onConnect({
      pageId: asset.pageId,
      name: channelName.trim() || buildDefaultName(asset.pageName, channelType),
      channelType,
      instagramAccountId: asset.instagramAccountId ?? undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Selecionar Página</SheetTitle>
          <SheetDescription>
            Escolha qual página conectar ao seu canal de{' '}
            {channelType === 'MESSENGER' ? 'Messenger' : 'Instagram'}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 px-4 py-4">
          {visibleAssets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {channelType === 'INSTAGRAM'
                ? 'Nenhuma página com conta do Instagram encontrada.'
                : 'Nenhuma página encontrada.'}
            </p>
          ) : (
            <RadioGroup
              value={selectedPageId}
              onValueChange={handlePageSelect}
              aria-label="Selecionar página"
            >
              {visibleAssets.map((asset) => (
                <label
                  key={asset.pageId}
                  className="hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-lg border p-4"
                >
                  <Radio value={asset.pageId} className="mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none">
                      {asset.pageName}
                    </p>
                    {channelType === 'INSTAGRAM' && asset.instagramUsername && (
                      <p className="text-muted-foreground text-xs">
                        @{asset.instagramUsername}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </RadioGroup>
          )}

          <div className="space-y-2">
            <Label htmlFor="channel-name">Nome do canal</Label>
            <Input
              id="channel-name"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Ex: Minha Empresa — Messenger"
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            disabled={!selectedPageId || !channelName.trim()}
            onClick={handleConnect}
          >
            Conectar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
