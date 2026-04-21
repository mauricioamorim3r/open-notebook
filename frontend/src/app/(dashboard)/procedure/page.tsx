'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useSources } from '@/lib/hooks/use-sources'
import { useModels } from '@/lib/hooks/use-models'
import { oraculoApi } from '@/lib/api/oraculo'
import type { ProcedureGenerateResponse } from '@/lib/api/oraculo'
import { ClipboardList, Copy, Check, X, Plus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </Button>
  )
}

export default function ProcedurePage() {
  const { data: sources, isLoading: sourcesLoading } = useSources()
  const { data: models } = useModels()

  const [scope, setScope] = useState('')
  const [contextSourceIds, setContextSourceIds] = useState<string[]>([])
  const [modelId, setModelId] = useState<string>('')
  const [sourceToAdd, setSourceToAdd] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ProcedureGenerateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddSource = () => {
    if (sourceToAdd && !contextSourceIds.includes(sourceToAdd)) {
      setContextSourceIds(prev => [...prev, sourceToAdd])
    }
    setSourceToAdd('')
  }

  const handleRemoveSource = (id: string) => {
    setContextSourceIds(prev => prev.filter(s => s !== id))
  }

  const getSourceTitle = (id: string) => {
    const source = sources?.find(s => s.id === id)
    return source?.title || id
  }

  const handleSubmit = async () => {
    if (!scope.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await oraculoApi.generateProcedure({
        scope: scope.trim(),
        context_source_ids: contextSourceIds.length > 0 ? contextSourceIds : undefined,
        model_id: modelId || undefined,
      })
      setResult(response)
    } catch (err) {
      setError('Falha ao gerar procedimento. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const chatModels = models?.filter(m => m.type === 'language') ?? []

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Gerar Procedimento</h1>
              <p className="text-sm text-muted-foreground">
                Gera um procedimento padrão Equinor a partir de um escopo e fontes de referência
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parâmetros de Geração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Scope */}
              <div className="space-y-2">
                <Label htmlFor="scope">
                  Escopo do Procedimento <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="scope"
                  value={scope}
                  onChange={e => setScope(e.target.value)}
                  placeholder="Descreva o escopo do procedimento a ser gerado. Ex: Procedimento de verificação de medidores de vazão ultrassônico tipo clamp-on para fiscalização de petróleo bruto conforme OIML R117."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Seja específico sobre o processo, equipamento, normas aplicáveis e contexto operacional.
                </p>
              </div>

              {/* Context sources */}
              <div className="space-y-2">
                <Label>Fontes de Referência (opcional)</Label>
                <CardDescription>
                  Selecione documentos para embasar o procedimento (normas, especificações, regulamentos).
                </CardDescription>

                {sourcesLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="flex gap-2">
                    <Select value={sourceToAdd} onValueChange={setSourceToAdd}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecionar fonte de referência..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sources?.filter(s => !contextSourceIds.includes(s.id)).map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="truncate">{s.title || s.id}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddSource}
                      disabled={!sourceToAdd}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {contextSourceIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {contextSourceIds.map(id => (
                      <Badge key={id} variant="secondary" className="gap-1.5 pr-1">
                        <span className="max-w-[180px] truncate text-xs">
                          {getSourceTitle(id)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSource(id)}
                          aria-label="Remover fonte"
                          className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Model */}
              {chatModels.length > 0 && (
                <div className="space-y-2">
                  <Label>Modelo de IA (opcional)</Label>
                  <Select value={modelId || "__default__"} onValueChange={(v) => setModelId(v === "__default__" ? "" : v)}>
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="Usar modelo padrão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">Modelo padrão</SelectItem>
                      {chatModels.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!scope.trim() || loading}
                className="gap-2"
              >
                {loading ? <LoadingSpinner /> : <ClipboardList className="h-4 w-4" />}
                {loading ? 'Gerando procedimento...' : 'Gerar Procedimento'}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-destructive/50">
              <CardContent className="pt-6 text-destructive text-sm">{error}</CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Procedimento Gerado</CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      Escopo: {result.scope}
                    </CardDescription>
                  </div>
                  <CopyButton text={result.procedure_output} />
                </div>
              </CardHeader>
              <CardContent>
                <article className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{result.procedure_output}</ReactMarkdown>
                </article>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}
