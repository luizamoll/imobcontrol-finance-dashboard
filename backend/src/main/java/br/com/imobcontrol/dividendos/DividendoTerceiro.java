package br.com.imobcontrol.dividendos;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "dividendos_terceiros")
public class DividendoTerceiro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(nullable = false, length = 200)
    private String imovel;

    @Column(name = "valor_base", nullable = false, precision = 19, scale = 2)
    private BigDecimal valorBase;

    @Column
    private String observacoes;

    @ElementCollection
    @CollectionTable(
            name = "dividendos_terceiros_participantes",
            joinColumns = @JoinColumn(name = "dividendo_id")
    )
    @OrderColumn(name = "ordem")
    private List<ParticipanteDividendoEmbeddable> participantes = new ArrayList<>();

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
    public String getImovel() { return imovel; }
    public void setImovel(String imovel) { this.imovel = imovel; }
    public BigDecimal getValorBase() { return valorBase; }
    public void setValorBase(BigDecimal valorBase) { this.valorBase = valorBase; }
    public String getObservacoes() { return observacoes; }
    public void setObservacoes(String observacoes) { this.observacoes = observacoes; }
    public List<ParticipanteDividendoEmbeddable> getParticipantes() { return participantes; }
    public void setParticipantes(List<ParticipanteDividendoEmbeddable> participantes) {
        this.participantes.clear();
        this.participantes.addAll(participantes);
    }
    public Long getVersao() { return versao; }
    public Long getCriadoPorUsuarioId() { return criadoPorUsuarioId; }
    public void setCriadoPorUsuarioId(Long criadoPorUsuarioId) { this.criadoPorUsuarioId = criadoPorUsuarioId; }
    public Long getAtualizadoPorUsuarioId() { return atualizadoPorUsuarioId; }
    public void setAtualizadoPorUsuarioId(Long atualizadoPorUsuarioId) { this.atualizadoPorUsuarioId = atualizadoPorUsuarioId; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
    public LocalDateTime getAtualizadoEm() { return atualizadoEm; }
}
