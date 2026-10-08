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
@Table(name = "empreendimentos")
public class Empreendimento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(length = 160)
    private String spe;

    @Column(length = 14)
    private String cnpj;

    @Column(name = "area_total", nullable = false, precision = 19, scale = 4)
    private BigDecimal areaTotal = BigDecimal.ZERO;

    @Column(nullable = false, length = 30)
    private String tipo;

    @Column(name = "unidades_previstas", nullable = false)
    private Integer unidadesPrevistas = 0;

    @Column(name = "valor_total", nullable = false, precision = 19, scale = 2)
    private BigDecimal valorTotal = BigDecimal.ZERO;

    @Column(name = "socio_nome", length = 160)
    private String socioNome;

    @Column(name = "socio_pct", nullable = false, precision = 9, scale = 4)
    private BigDecimal socioPct = BigDecimal.ZERO;

    @Column(name = "empresa_pct", nullable = false, precision = 9, scale = 4)
    private BigDecimal empresaPct = BigDecimal.ZERO;

    @Column(name = "corretor_pct", nullable = false, precision = 9, scale = 4)
    private BigDecimal corretorPct = BigDecimal.ZERO;

    @Column(name = "aliquota_tributaria", nullable = false, precision = 9, scale = 4)
    private BigDecimal aliquotaTributaria = BigDecimal.ZERO;

    @Column(name = "repasse_comissao_pct", nullable = false, precision = 9, scale = 4)
    private BigDecimal repasseComissaoPct = new BigDecimal("50");

    @Column(name = "comissao_sobre_acrescimos", nullable = false)
    private boolean comissaoSobreAcrescimos;

    @Column(name = "inadimplencia_json", columnDefinition = "TEXT")
    private String inadimplenciaJson;

    @Column(name = "reajuste_contratual_json", columnDefinition = "TEXT")
    private String reajusteContratualJson;

    @Column(columnDefinition = "TEXT")
    private String observacoes;

    @Column(nullable = false, length = 30)
    private String status;

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
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getSpe() { return spe; }
    public void setSpe(String spe) { this.spe = spe; }
    public String getCnpj() { return cnpj; }
    public void setCnpj(String cnpj) { this.cnpj = cnpj; }
    public BigDecimal getAreaTotal() { return areaTotal; }
    public void setAreaTotal(BigDecimal areaTotal) { this.areaTotal = areaTotal; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public Integer getUnidadesPrevistas() { return unidadesPrevistas; }
    public void setUnidadesPrevistas(Integer unidadesPrevistas) { this.unidadesPrevistas = unidadesPrevistas; }
    public BigDecimal getValorTotal() { return valorTotal; }
    public void setValorTotal(BigDecimal valorTotal) { this.valorTotal = valorTotal; }
    public String getSocioNome() { return socioNome; }
    public void setSocioNome(String socioNome) { this.socioNome = socioNome; }
    public BigDecimal getSocioPct() { return socioPct; }
    public void setSocioPct(BigDecimal socioPct) { this.socioPct = socioPct; }
    public BigDecimal getEmpresaPct() { return empresaPct; }
    public void setEmpresaPct(BigDecimal empresaPct) { this.empresaPct = empresaPct; }
    public BigDecimal getCorretorPct() { return corretorPct; }
    public void setCorretorPct(BigDecimal corretorPct) { this.corretorPct = corretorPct; }
    public BigDecimal getAliquotaTributaria() { return aliquotaTributaria; }
    public void setAliquotaTributaria(BigDecimal aliquotaTributaria) { this.aliquotaTributaria = aliquotaTributaria; }
    public BigDecimal getRepasseComissaoPct() { return repasseComissaoPct; }
    public void setRepasseComissaoPct(BigDecimal repasseComissaoPct) { this.repasseComissaoPct = repasseComissaoPct; }
    public boolean isComissaoSobreAcrescimos() { return comissaoSobreAcrescimos; }
    public void setComissaoSobreAcrescimos(boolean comissaoSobreAcrescimos) { this.comissaoSobreAcrescimos = comissaoSobreAcrescimos; }
    public String getInadimplenciaJson() { return inadimplenciaJson; }
    public void setInadimplenciaJson(String inadimplenciaJson) { this.inadimplenciaJson = inadimplenciaJson; }
    public String getReajusteContratualJson() { return reajusteContratualJson; }
    public void setReajusteContratualJson(String reajusteContratualJson) { this.reajusteContratualJson = reajusteContratualJson; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getVersao() { return versao; }
    public Long getCriadoPorUsuarioId() { return criadoPorUsuarioId; }
    public void setCriadoPorUsuarioId(Long criadoPorUsuarioId) { this.criadoPorUsuarioId = criadoPorUsuarioId; }
    public Long getAtualizadoPorUsuarioId() { return atualizadoPorUsuarioId; }
    public void setAtualizadoPorUsuarioId(Long atualizadoPorUsuarioId) { this.atualizadoPorUsuarioId = atualizadoPorUsuarioId; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
}
