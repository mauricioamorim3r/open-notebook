'use client'

import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useSources } from '@/lib/hooks/use-sources'
import { useModels } from '@/lib/hooks/use-models'
import { oraculoApi } from '@/lib/api/oraculo'
import type { CompareResponse, AdherenceResponse } from '@/lib/api/oraculo'
import { FileSearch2, GitCompare, ShieldCheck, Copy, Check } from 'lucide-react'
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

function CompareTab() {
  const { data: sources, isLoading: sourcesLoading } = useSources()
  const { data: models } = useModels()
  const [sourceAId, setSourceAId] = useState<string>('')
  const [sourceBId, setSourceBId] = useState<string>('')
  const [modelId, setModelId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!sourceAId || !sourceBId) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await oraculoApi.compare({
        source_a_id: sourceAId,
        source_b_id: sourceBId,
        model_id: modelId || undefined,
      })
      setResult(response)
    } catch (err) {
      setError('Falha ao comparar documentos. Verifique se os documentos têm conteúdo processado.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const chatModels = models?.filter(m => m.type === 'language') ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitCompare className="h-4 w-4" />
            Comparar Documentos
          </CardTitle>
          <CardDescription>
            Gera um relatório detalhado comparando duas fontes de documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sourcesLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Documento A</Label>
                  <Select value={sourceAId} onValueChange={setSourceAId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar fonte..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sources?.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="truncate max-w-[200px]">{s.title || s.id}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Documento B</Label>
                  <Select value={sourceBId} onValueChange={setSourceBId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar fonte..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sources?.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="truncate max-w-[200px]">{s.title || s.id}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                disabled={!sourceAId || !sourceBId || loading}
                className="gap-2"
              >
                {loading ? <LoadingSpinner /> : <GitCompare className="h-4 w-4" />}
                {loading ? 'Comparando...' : 'Comparar'}
              </Button>
            </>
          )}
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
                <CardTitle className="text-base">Relatório de Comparação</CardTitle>
                <CardDescription className="flex gap-2 mt-1">
                  <Badge variant="outline">{result.source_a_title || result.source_a_id}</Badge>
                  <span className="text-muted-foreground">vs</span>
                  <Badge variant="outline">{result.source_b_title || result.source_b_id}</Badge>
                </CardDescription>
              </div>
              <CopyButton text={result.comparison_report} />
            </div>
          </CardHeader>
          <CardContent>
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{result.comparison_report}</ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AdherenceTab() {
  const { data: sources, isLoading: sourcesLoading } = useSources()
  const { data: models } = useModels()
  const [documentId, setDocumentId] = useState<string>('')
  const [referenceId, setReferenceId] = useState<string>('')
  const [modelId, setModelId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AdherenceResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!documentId || !referenceId) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await oraculoApi.analyzeAdherence({
        document_id: documentId,
        reference_id: referenceId,
        model_id: modelId || undefined,
      })
      setResult(response)
    } catch (err) {
      setError('Falha na análise de aderência. Verifique se os documentos têm conteúdo processado.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const chatModels = models?.filter(m => m.type === 'language') ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Análise de Aderência
          </CardTitle>
          <CardDescription>
            Avalia em que medida um documento está em conformidade com uma norma ou regulamento de referência.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sourcesLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Documento a Analisar</Label>
                  <Select value={documentId} onValueChange={setDocumentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar documento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sources?.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="truncate max-w-[200px]">{s.title || s.id}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Norma / Regulamento de Referência</Label>
                  <Select value={referenceId} onValueChange={setReferenceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar referência..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sources?.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="truncate max-w-[200px]">{s.title || s.id}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                disabled={!documentId || !referenceId || loading}
                className="gap-2"
              >
                {loading ? <LoadingSpinner /> : <ShieldCheck className="h-4 w-4" />}
                {loading ? 'Analisando...' : 'Analisar Aderência'}
              </Button>
            </>
          )}
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
                <CardTitle className="text-base">Relatório de Aderência</CardTitle>
                <CardDescription className="flex gap-2 mt-1">
                  <Badge variant="outline">{result.document_title || result.document_id}</Badge>
                  <span className="text-muted-foreground">vs</span>
                  <Badge variant="secondary">{result.reference_title || result.reference_id}</Badge>
                </CardDescription>
              </div>
              <CopyButton text={result.adherence_report} />
            </div>
          </CardHeader>
          <CardContent>
            <article className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{result.adherence_report}</ReactMarkdown>
            </article>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <FileSearch2 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Análise de Documentos</h1>
              <p className="text-sm text-muted-foreground">
                Compare documentos ou avalie aderência a normas e regulamentos
              </p>
            </div>
          </div>

          <Tabs defaultValue="compare">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="compare" className="gap-2">
                <GitCompare className="h-3.5 w-3.5" />
                Comparação
              </TabsTrigger>
              <TabsTrigger value="adherence" className="gap-2">
                <ShieldCheck className="h-3.5 w-3.5" />
                Aderência
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compare" className="mt-6">
              <CompareTab />
            </TabsContent>
            <TabsContent value="adherence" className="mt-6">
              <AdherenceTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  )
}
