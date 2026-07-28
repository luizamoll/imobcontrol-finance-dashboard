import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { EmpStatusBadge } from "@/components/status-badges";
import { useStore, empTotais, type EmpStatus } from "@/lib/store";
import { brl0, formatCNPJ, num, pct } from "@/lib/format";

export const Route = createFileRoute("/empreendimentos/")({
  component: EmpreendimentosList,
});

function EmpreendimentosList() {
  const { state, addEmpreendimento, resetSeed } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Portfólio"
        title="Empreendimentos"
        description="Cadastre e acompanhe cada empreendimento, SPE, unidades, VGV e status de comercialização."
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetSeed();
                toast.success("Dados de demonstração restaurados");
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Restaurar dados
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo empreendimento
                </Button>
              </DialogTrigger>
              <NewEmpreendimentoDialog
                onSave={(e) => {
                  addEmpreendimento({ tipo: "loteamento", ...e });
                  toast.success(`Empreendimento "${e.nome}" cadastrado`);
                  setOpen(false);
                }}
              />
            </Dialog>
          </>
        }
      />

      <Card className="border-border/70">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empreendimento</TableHead>
                <TableHead>SPE · CNPJ</TableHead>
                <TableHead className="text-right">Área total</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">VGV</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Saldo a receber</TableHead>
                <TableHead>% vendido</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.empreendimentos.map((e) => {
                const t = empTotais(e.id, state.vendas, state.parcelas);
                const vendidoPct = e.valorTotal
                  ? Math.min(100, (t.vendido / e.valorTotal) * 100)
                  : 0;
                return (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <Link
                        to="/empreendimentos/$id"
                        params={{ id: e.id }}
                        className="flex items-center gap-2 text-foreground hover:text-primary"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        {e.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="text-foreground">{e.spe}</div>
                      <div className="text-xs text-muted-foreground">{e.cnpj}</div>
                    </TableCell>
                    <TableCell className="text-right">{num(e.areaTotal)} m²</TableCell>
                    <TableCell className="text-right">{e.matriculasCount}</TableCell>
                    <TableCell className="text-right font-medium">
                      {brl0(e.valorTotal)}
                    </TableCell>
                    <TableCell className="text-right">{brl0(t.vendido)}</TableCell>
                    <TableCell className="text-right text-success">
                      {brl0(t.recebido)}
                    </TableCell>
                    <TableCell className="text-right">{brl0(t.saldo)}</TableCell>
                    <TableCell className="w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={vendidoPct} className="h-1.5" />
                        <span className="w-12 text-right text-xs text-muted-foreground">
                          {pct(vendidoPct)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <EmpStatusBadge status={e.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function NewEmpreendimentoDialog({
  onSave,
}: {
  onSave: (e: {
    nome: string;
    spe: string;
    cnpj: string;
    areaTotal: number;
    matriculasCount: number;
    valorTotal: number;
    socioPct: number;
    empresaPct: number;
    corretorPct: number;
    aliquotaTributaria: number;
    observacoes?: string;
    status: EmpStatus;
  }) => void;
}) {
  const [nome, setNome] = useState("");
  const [spe, setSpe] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [areaTotal, setAreaTotal] = useState("");
  const [matriculasCount, setMatriculasCount] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [socioPct, setSocioPct] = useState("40");
  const [empresaPct, setEmpresaPct] = useState("55");
  const [corretorPct, setCorretorPct] = useState("5");
  const [aliq, setAliq] = useState("6.73");
  const [obs, setObs] = useState("");
  const [status, setStatus] = useState<EmpStatus>("planejamento");

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Novo empreendimento</DialogTitle>
        <DialogDescription>
          Informe os dados da SPE e características do empreendimento.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Nome do empreendimento</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label>SPE responsável</Label>
          <Input value={spe} onChange={(e) => setSpe(e.target.value)} />
        </div>
        <div>
          <Label>CNPJ da SPE</Label>
          <Input
            value={cnpj}
            onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
            placeholder="00.000.000/0000-00"
          />
        </div>
        <div>
          <Label>Área total (m²)</Label>
          <Input
            type="number"
            value={areaTotal}
            onChange={(e) => setAreaTotal(e.target.value)}
          />
        </div>
        <div>
          <Label>Quantidade de matrículas / unidades</Label>
          <Input
            type="number"
            value={matriculasCount}
            onChange={(e) => setMatriculasCount(e.target.value)}
          />
        </div>
        <div>
          <Label>Valor total estimado (R$)</Label>
          <Input
            type="number"
            value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)}
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as EmpStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planejamento">Planejamento</SelectItem>
              <SelectItem value="lancamento">Lançamento</SelectItem>
              <SelectItem value="em_vendas">Em vendas</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>% Sócio</Label>
          <Input
            type="number"
            value={socioPct}
            onChange={(e) => setSocioPct(e.target.value)}
          />
        </div>
        <div>
          <Label>% Empresa</Label>
          <Input
            type="number"
            value={empresaPct}
            onChange={(e) => setEmpresaPct(e.target.value)}
          />
        </div>
        <div>
          <Label>% Corretor</Label>
          <Input
            type="number"
            value={corretorPct}
            onChange={(e) => setCorretorPct(e.target.value)}
          />
        </div>
        <div>
          <Label>Alíquota tributária (%)</Label>
          <Input type="number" value={aliq} onChange={(e) => setAliq(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Observações</Label>
          <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSave({
              nome,
              spe,
              cnpj,
              areaTotal: Number(areaTotal) || 0,
              matriculasCount: Number(matriculasCount) || 0,
              valorTotal: Number(valorTotal) || 0,
              socioPct: Number(socioPct) || 0,
              empresaPct: Number(empresaPct) || 0,
              corretorPct: Number(corretorPct) || 0,
              aliquotaTributaria: Number(aliq) || 0,
              observacoes: obs,
              status,
            })
          }
          disabled={!nome || !spe}
        >
          Cadastrar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
