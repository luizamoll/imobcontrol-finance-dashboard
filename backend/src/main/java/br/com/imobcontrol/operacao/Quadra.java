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

import java.time.LocalDateTime;

@Entity
@Table(name = "quadras")
public class Quadra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "empreendimento_id", nullable = false)
    private Long empreendimentoId;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(name = "tipo_agrupamento", nullable = false, length = 30)
    private String tipoAgrupamento = "quadra";

    @Column(columnDefinition = "TEXT")
    private String descricao;

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
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getTipoAgrupamento() { return tipoAgrupamento; }
    public void setTipoAgrupamento(String tipoAgrupamento) { this.tipoAgrupamento = tipoAgrupamento; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
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
