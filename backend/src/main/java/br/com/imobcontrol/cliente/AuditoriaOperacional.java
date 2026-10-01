package br.com.imobcontrol.cliente;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "auditoria_operacional")
public class AuditoriaOperacional {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 60)
    private String entidade;

    @Column(name = "entidade_id", nullable = false)
    private Long entidadeId;

    @Column(nullable = false, length = 40)
    private String acao;

    @Column(columnDefinition = "TEXT")
    private String detalhes;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    protected AuditoriaOperacional() {
    }

    public AuditoriaOperacional(
            Long empresaId,
            Long usuarioId,
            String entidade,
            Long entidadeId,
            String acao
    ) {
        this(empresaId, usuarioId, entidade, entidadeId, acao, null);
    }

    public AuditoriaOperacional(
            Long empresaId,
            Long usuarioId,
            String entidade,
            Long entidadeId,
            String acao,
            String detalhes
    ) {
        this.empresaId = empresaId;
        this.usuarioId = usuarioId;
        this.entidade = entidade;
        this.entidadeId = entidadeId;
        this.acao = acao;
        this.detalhes = detalhes;
    }

    @PrePersist
    void prePersist() {
        criadoEm = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public Long getUsuarioId() { return usuarioId; }
    public String getEntidade() { return entidade; }
    public Long getEntidadeId() { return entidadeId; }
    public String getAcao() { return acao; }
    public String getDetalhes() { return detalhes; }
    public LocalDateTime getCriadoEm() { return criadoEm; }
}
