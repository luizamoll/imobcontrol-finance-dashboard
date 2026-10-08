package br.com.imobcontrol.financeiro;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "vendas")
public class Venda {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name="empresa_id", nullable=false) private Long empresaId;
    @Column(name="empreendimento_id", nullable=false) private Long empreendimentoId;
    @Column(name="unidade_id", nullable=false) private Long unidadeId;
    @Column(name="cliente_id", nullable=false) private Long clienteId;
    @Column(name="valor_total", nullable=false, precision=19, scale=2) private BigDecimal valorTotal;
    @Column(name="valor_imovel", precision=19, scale=2) private BigDecimal valorImovel;
    @Column(name="corretagem_valor", precision=19, scale=2) private BigDecimal corretagemValor;
    @Column(name="corretagem_compoe_valor_contrato") private Boolean corretagemCompoeValorContrato;
    @Column(name="corretagem_forma_pagamento", length=40) private String corretagemFormaPagamento;
    @Column(name="data_contrato", nullable=false) private LocalDate dataContrato;
    @Column(name="corretor_nome", length=160) private String corretorNome;
    @Column(name="corretor_pct", nullable=false, precision=9, scale=4) private BigDecimal corretorPct = BigDecimal.ZERO;
    @Column(name="repasse_comissao_pct", nullable=false, precision=9, scale=4) private BigDecimal repasseComissaoPct = new BigDecimal("50");
    @Column(name="comissao_sobre_acrescimos", nullable=false) private boolean comissaoSobreAcrescimos;
    @Column(columnDefinition="TEXT") private String observacoes;
    @Column(nullable=false, length=30) private String status;
    @Column(name="regras_json", nullable=false, columnDefinition="TEXT") private String regrasJson;
    @Version @Column(nullable=false) private Long versao;
    @Column(name="criado_por_usuario_id", nullable=false) private Long criadoPorUsuarioId;
    @Column(name="atualizado_por_usuario_id", nullable=false) private Long atualizadoPorUsuarioId;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm;
    @Column(name="atualizado_em", nullable=false) private LocalDateTime atualizadoEm;

    @PrePersist void prePersist(){ var a=LocalDateTime.now(); criadoEm=a; atualizadoEm=a; }
    @PreUpdate void preUpdate(){ atualizadoEm=LocalDateTime.now(); }

    public Long getId(){return id;} public Long getEmpresaId(){return empresaId;} public void setEmpresaId(Long v){empresaId=v;}
    public Long getEmpreendimentoId(){return empreendimentoId;} public void setEmpreendimentoId(Long v){empreendimentoId=v;}
    public Long getUnidadeId(){return unidadeId;} public void setUnidadeId(Long v){unidadeId=v;}
    public Long getClienteId(){return clienteId;} public void setClienteId(Long v){clienteId=v;}
    public BigDecimal getValorTotal(){return valorTotal;} public void setValorTotal(BigDecimal v){valorTotal=v;}
    public BigDecimal getValorImovel(){return valorImovel;} public void setValorImovel(BigDecimal v){valorImovel=v;}
    public BigDecimal getCorretagemValor(){return corretagemValor;} public void setCorretagemValor(BigDecimal v){corretagemValor=v;}
    public Boolean getCorretagemCompoeValorContrato(){return corretagemCompoeValorContrato;} public void setCorretagemCompoeValorContrato(Boolean v){corretagemCompoeValorContrato=v;}
    public String getCorretagemFormaPagamento(){return corretagemFormaPagamento;} public void setCorretagemFormaPagamento(String v){corretagemFormaPagamento=v;}
    public LocalDate getDataContrato(){return dataContrato;} public void setDataContrato(LocalDate v){dataContrato=v;}
    public String getCorretorNome(){return corretorNome;} public void setCorretorNome(String v){corretorNome=v;}
    public BigDecimal getCorretorPct(){return corretorPct;} public void setCorretorPct(BigDecimal v){corretorPct=v;}
    public BigDecimal getRepasseComissaoPct(){return repasseComissaoPct;} public void setRepasseComissaoPct(BigDecimal v){repasseComissaoPct=v;}
    public boolean isComissaoSobreAcrescimos(){return comissaoSobreAcrescimos;} public void setComissaoSobreAcrescimos(boolean v){comissaoSobreAcrescimos=v;}
    public String getObservacoes(){return observacoes;} public void setObservacoes(String v){observacoes=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getRegrasJson(){return regrasJson;} public void setRegrasJson(String v){regrasJson=v;}
    public Long getVersao(){return versao;} public Long getCriadoPorUsuarioId(){return criadoPorUsuarioId;} public void setCriadoPorUsuarioId(Long v){criadoPorUsuarioId=v;}
    public Long getAtualizadoPorUsuarioId(){return atualizadoPorUsuarioId;} public void setAtualizadoPorUsuarioId(Long v){atualizadoPorUsuarioId=v;}
    public LocalDateTime getCriadoEm(){return criadoEm;} public LocalDateTime getAtualizadoEm(){return atualizadoEm;}
}
