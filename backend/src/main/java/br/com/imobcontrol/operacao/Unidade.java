package br.com.imobcontrol.operacao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "unidades")
public class Unidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "empreendimento_id", nullable = false)
    private Long empreendimentoId;

    @Column(name = "quadra_id")
    private Long quadraId;

    @Column(nullable = false, length = 80)
    private String numero;

    @Column(nullable = false, length = 120)
    private String unidade;

    @Column(name = "unidade_tipo", length = 30)
    private String unidadeTipo;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal area = BigDecimal.ZERO;

    @Column(name = "valor_venda", nullable = false, precision = 19, scale = 2)
    private BigDecimal valorVenda = BigDecimal.ZERO;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "regras_json", columnDefinition = "TEXT")
    private String regrasJson;

    @Version
    @Column(nullable = false)
    private Long versao;

    @Column(name = "criado_por_usuario_id", nullable = false)
    private Long criadoPorUsuarioId;

    @Column(name = "atualizado_por_usuario_id", nullable = false)
    private Long atualizadoPorUsuarioId;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm;

    @PrePersist
    void prePersist() {
        LocalDateTime agora = LocalDateTime.now();
        criadoEm = agora;
        atualizadoEm = agora;
    }

    @PreUpdate
    void preUpdate() {
        atualizadoEm = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long empresaId) { this.empresaId = empresaId; }
    public Long getEmpreendimentoId() { return empreendimentoId; }
    public void setEmpreendimentoId(Long empreendimentoId) { this.empreendimentoId = empreendimentoId; }
    public Long getQuadraId() { return quadraId; }
    public void setQuadraId(Long quadraId) { this.quadraId = quadraId; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getUnidade() { return unidade; }
    public void setUnidade(String unidade) { this.unidade = unidade; }
    public String getUnidadeTipo() { return unidadeTipo; }
    public void setUnidadeTipo(String unidadeTipo) { this.unidadeTipo = unidadeTipo; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public BigDecimal getArea() { return area; }
    public void setArea(BigDecimal area) { this.area = area; }
    public BigDecimal getValorVenda() { return valorVenda; }
    public void setValorVenda(BigDecimal valorVenda) { this.valorVenda = valorVenda; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getRegrasJson() { return regrasJson; }
    public void setRegrasJson(String regrasJson) { this.regrasJson = regrasJson; }
    public Long getVersao() { return versao; }
    public Long getCriadoPorUsuarioId() { return criadoPorUsuarioId; }
    public void setCriadoPorUsuarioId(Long criadoPorUsuarioId) { this.criadoPorUsuarioId = criadoPorUsuarioId; }
    public Long getAtualizadoPorUsuarioId() { return atualizadoPorUsuarioId; }
    public void setAtualizadoPorUsuarioId(Long atualizadoPorUsuarioId) { this.atualizadoPorUsuarioId = atualizadoPorUsuarioId; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
}
