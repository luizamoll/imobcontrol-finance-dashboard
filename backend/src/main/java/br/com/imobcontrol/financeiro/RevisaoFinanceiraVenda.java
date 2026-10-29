package br.com.imobcontrol.financeiro;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "revisoes_financeiras_vendas")
public class RevisaoFinanceiraVenda {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "empresa_id", nullable = false) private Long empresaId;
    @Column(name = "venda_id", nullable = false) private Long vendaId;
    @Column(name = "usuario_id", nullable = false) private Long usuarioId;
    @Column(nullable = false, length = 1000) private String justificativa;
    @Column(name = "versao_anterior", nullable = false) private Long versaoAnterior;
    @Column(name = "versao_nova", nullable = false) private Long versaoNova;
    @Column(name = "resumo_anterior", nullable = false, columnDefinition = "TEXT") private String resumoAnterior;
    @Column(name = "resumo_novo", nullable = false, columnDefinition = "TEXT") private String resumoNovo;
    @Column(name = "criado_em", nullable = false) private LocalDateTime criadoEm;
    @PrePersist void prePersist() { criadoEm = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long v) { empresaId = v; }
    public Long getVendaId() { return vendaId; }
    public void setVendaId(Long v) { vendaId = v; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long v) { usuarioId = v; }
    public String getJustificativa() { return justificativa; }
    public void setJustificativa(String v) { justificativa = v; }
    public Long getVersaoAnterior() { return versaoAnterior; }
    public void setVersaoAnterior(Long v) { versaoAnterior = v; }
    public Long getVersaoNova() { return versaoNova; }
    public void setVersaoNova(Long v) { versaoNova = v; }
    public String getResumoAnterior() { return resumoAnterior; }
    public void setResumoAnterior(String v) { resumoAnterior = v; }
    public String getResumoNovo() { return resumoNovo; }
    public void setResumoNovo(String v) { resumoNovo = v; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
}