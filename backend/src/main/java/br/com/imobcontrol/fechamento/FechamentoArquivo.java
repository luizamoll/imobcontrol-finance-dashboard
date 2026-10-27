package br.com.imobcontrol.fechamento;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fechamento_mensal_arquivos")
public class FechamentoArquivo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "empresa_id", nullable = false) private Long empresaId;
    @Column(name = "empreendimento_id", nullable = false) private Long empreendimentoId;
    @Column(nullable = false, length = 7) private String mes;
    @Column(name = "relatorio_json", nullable = false, columnDefinition = "TEXT") private String relatorioJson;
    @Column(name = "criado_por_usuario_id", nullable = false) private Long criadoPorUsuarioId;
    @Column(name = "criado_em", nullable = false) private LocalDateTime criadoEm;
    @PrePersist void criar() { criadoEm = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long v) { empresaId = v; }
    public Long getEmpreendimentoId() { return empreendimentoId; }
    public void setEmpreendimentoId(Long v) { empreendimentoId = v; }
    public String getMes() { return mes; }
    public void setMes(String v) { mes = v; }
    public String getRelatorioJson() { return relatorioJson; }
    public void setRelatorioJson(String v) { relatorioJson = v; }
    public Long getCriadoPorUsuarioId() { return criadoPorUsuarioId; }
    public void setCriadoPorUsuarioId(Long v) { criadoPorUsuarioId = v; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
}