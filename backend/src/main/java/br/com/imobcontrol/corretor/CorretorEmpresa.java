package br.com.imobcontrol.corretor;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "corretores_empresa")
public class CorretorEmpresa {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "empresa_id", nullable = false) private Long empresaId;
    @Column(nullable = false, length = 160) private String nome;
    @Column(length = 30) private String documento;
    @Column(length = 80) private String creci;
    @Column(length = 200) private String email;
    @Column(length = 30) private String telefone;
    @Column(name = "chave_pix", length = 200) private String chavePix;
    @Version @Column(nullable = false) private Long versao;
    @Column(name = "criado_em", nullable = false) private LocalDateTime criadoEm;
    @Column(name = "atualizado_em", nullable = false) private LocalDateTime atualizadoEm;

    @PrePersist void criar() {
        criadoEm = LocalDateTime.now();
        atualizadoEm = criadoEm;
    }
    @PreUpdate void atualizar() { atualizadoEm = LocalDateTime.now(); }

    public Long getId() { return id; }
    public Long getEmpresaId() { return empresaId; }
    public void setEmpresaId(Long v) { empresaId = v; }
    public String getNome() { return nome; }
    public void setNome(String v) { nome = v; }
    public String getDocumento() { return documento; }
    public void setDocumento(String v) { documento = v; }
    public String getCreci() { return creci; }
    public void setCreci(String v) { creci = v; }
    public String getEmail() { return email; }
    public void setEmail(String v) { email = v; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String v) { telefone = v; }
    public String getChavePix() { return chavePix; }
    public void setChavePix(String v) { chavePix = v; }
    public Long getVersao() { return versao; }
}