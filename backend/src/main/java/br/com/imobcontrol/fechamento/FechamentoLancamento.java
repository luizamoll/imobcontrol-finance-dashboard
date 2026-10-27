package br.com.imobcontrol.fechamento;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "fechamento_mensal_lancamentos")
public class FechamentoLancamento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "empresa_id", nullable = false) private Long empresaId;
    @Column(name = "empreendimento_id", nullable = false) private Long empreendimentoId;
    @Column(name = "data_lancamento", nullable = false) private LocalDate dataLancamento;
    @Column(nullable = false, length = 35) private String tipo;
    @Column(nullable = false, length = 240) private String descricao;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal valor;
    @Column(name = "criado_por_usuario_id", nullable = false) private Long criadoPorUsuarioId;
    @Column(name = "criado_em", nullable = false) private LocalDateTime criadoEm;
    @Column(name = "estornado_por_usuario_id") private Long estornadoPorUsuarioId;
    @Column(name = "estornado_em") private LocalDateTime estornadoEm;

    @PrePersist void prePersist() { criadoEm = LocalDateTime.now(); }
    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long v) { empresaId = v; }
    public Long getEmpreendimentoId() { return empreendimentoId; }
    public void setEmpreendimentoId(Long v) { empreendimentoId = v; }
    public LocalDate getDataLancamento() { return dataLancamento; }
    public void setDataLancamento(LocalDate v) { dataLancamento = v; }
    public String getTipo() { return tipo; }
    public void setTipo(String v) { tipo = v; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String v) { descricao = v; }
    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal v) { valor = v; }
    public Long getCriadoPorUsuarioId() { return criadoPorUsuarioId; }
    public void setCriadoPorUsuarioId(Long v) { criadoPorUsuarioId = v; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public Long getEstornadoPorUsuarioId() { return estornadoPorUsuarioId; }
    public void setEstornadoPorUsuarioId(Long v) { estornadoPorUsuarioId = v; }
    public LocalDateTime getEstornadoEm() { return estornadoEm; }
    public void setEstornadoEm(LocalDateTime v) { estornadoEm = v; }
}