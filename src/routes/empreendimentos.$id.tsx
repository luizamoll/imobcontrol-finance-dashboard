import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Building2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
import {
  EmpStatusBadge,
  MatriculaStatusBadge,
} from "@/components/status-badges";
import {
  useStore,
  empTotais,
  type MatriculaStatus,
} from "@/lib/store";
import { brl0, num, pct } from "@/lib/format";

export const Route = createFileRoute("/empreendimentos/$id")({
  component: EmpreendimentoDetail,
  head: ({ params }) => ({
    meta: [{ title: `Empreendimento · ImobControl` }],
  }),
  notFoundComponent: () => (
    <PageShell>
      <PageHeader
        eyebrow="Portfólio"
        title="Empreendimento não encontrado"
      />
    </PageShell>
  ),
});

function EmpreendimentoDetail() {
  const { id } = Route.useParams();
  const { state, addMatricula } = useStore();
  const emp = state.empreendimentos.find((e) => e.id === id);
  const [open, setOpen] = useState(false);

  if (!emp) throw notFound();
  const t = empTotais(emp.id, state.vendas, state.parcelas);
  const matriculas = state.matriculas.filter((m) => m.empreendimentoId === emp.id);
  const vendidoPct = emp.valorTotal
    ? Math.min(100, (t.vendido / emp.valorTotal) * 100)
    : 0;

  return (
    <PageShell>
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to="/empreendimentos">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para empreendimentos
          </Link>
        </Button>
      </div>
      <PageHeader
        eyebrow={emp.spe}
        title={emp.nome}
        description={emp.observacoes || `CNPJ ${emp.cnpj}`}
        actions={<EmpStatusBadge status={emp.status} />}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatBox label="VGV" value={brl0(emp.valorTotal)} />
        <StatBox label="Vendido" value={brl0(t.vendido)} sub={pct(vendidoPct)} />
        <StatBox label="Recebido" value={brl0(t.recebido)} />
        <StatBox label="Saldo a receber" value={brl0(t.saldo)} />
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Progresso comercial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Progress value={vendidoPct} />
            <span className="w-16 text-right text-sm text-muted-foreground">
              {pct(vendidoPct)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Info label="Área total" value={`${num(emp.areaTotal)} m²`} />
            <Info label="Unidades cadastradas" value={String(matriculas.length)} />
            <Info label="Vendas ativas" value={String(t.vendas)} />
            <Info label="Alíquota tributária" value={`${emp.aliquotaTributaria}%`} />
            <Info label="% Sócio" value={`${emp.socioPct}%`} />
            <Info label="% Empresa" value={`${emp.empresaPct}%`} />
            <Info label="% Corretor" value={`${emp.corretorPct}%`} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Matrículas / Unidades
          </CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Nova matrícula
              </Button>
            </DialogTrigger>
            <NewMatriculaDialog
              onSave={(m) => {
                addMatricula({ ...m, empreendimentoId: emp.id });
                toast.success("Matrícula cadastrada");
                setOpen(false);
              }}
            />
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Área</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matriculas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma matrícula cadastrada.
                  </TableCell>
                </TableRow>
              )}
              {matriculas.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.numero}</TableCell>
                  <TableCell>{m.unidade}</TableCell>
                  <TableCell className="text-right">{num(m.area)} m²</TableCell>
                  <TableCell className="text-right">{brl0(m.valorVenda)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.compradorNome || "—"}
                  </TableCell>
                  <TableCell>
                    <MatriculaStatusBadge status={m.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}

function NewMatriculaDialog({
  onSave,
}: {
  onSave: (m: {
    numero: string;
    unidade: string;
    area: number;
    valorVenda: number;
    status: MatriculaStatus;
  }) => void;
}) {
  const [numero, setNumero] = useState("");
  const [unidade, setUnidade] = useState("");
  const [area, setArea] = useState("");
  const [valor, setValor] = useState("");
  const [status, setStatus] = useState<MatriculaStatus>("disponivel");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nova matrícula / unidade</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Número da matrícula</Label>
          <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
        </div>
        <div>
          <Label>Unidade / Lote</Label>
          <Input value={unidade} onChange={(e) => setUnidade(e.target.value)} />
        </div>
        <div>
          <Label>Área (m²)</Label>
          <Input type="number" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div>
          <Label>Valor de venda (R$)</Label>
          <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as MatriculaStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="reservado">Reservado</SelectItem>
              <SelectItem value="vendido">Vendido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() =>
            onSave({
              numero,
              unidade,
              area: Number(area) || 0,
              valorVenda: Number(valor) || 0,
              status,
            })
          }
          disabled={!numero || !unidade}
        >
          Cadastrar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
