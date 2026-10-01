package br.com.imobcontrol.financeiro;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="parcelas")
public class Parcela {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="empresa_id", nullable=false) private Long empresaId;
    @Column(name="venda_id", nullable=false) private Long vendaId;
    @Column(name="empreendimento_id", nullable=false) private Long empreendimentoId;
    @Column(name="unidade_id", nullable=false) private Long unidadeId;
    @Column(name="cliente_id", nullable=false) private Long clienteId;
    @Column(name="origem_tipo", nullable=false, length=40) private String origemTipo;
    @Column(name="origem_descricao", length=240) private String origemDescricao;
    @Column(nullable=false) private Integer numero;
    @Column(name="total_parcelas", nullable=false) private Integer totalParcelas;
    @Column(nullable=false) private LocalDate vencimento;
    @Column(nullable=false, precision=19, scale=2) private BigDecimal valor;
    @Column(name="valor_pago", nullable=false, precision=19, scale=2) private BigDecimal valorPago=BigDecimal.ZERO;
    @Column(name="data_pagamento") private LocalDate dataPagamento;
    @Column(nullable=false, length=30) private String status;
    @Column(name="regras_inadimplencia_json", columnDefinition="TEXT") private String regrasInadimplenciaJson;
    @Version @Column(nullable=false) private Long versao;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm;
    @Column(name="atualizado_em", nullable=false) private LocalDateTime atualizadoEm;
    @PrePersist void prePersist(){var a=LocalDateTime.now();criadoEm=a;atualizadoEm=a;}
    @PreUpdate void preUpdate(){atualizadoEm=LocalDateTime.now();}
    public Long getId(){return id;} public Long getEmpresaId(){return empresaId;} public void setEmpresaId(Long v){empresaId=v;}
    public Long getVendaId(){return vendaId;} public void setVendaId(Long v){vendaId=v;} public Long getEmpreendimentoId(){return empreendimentoId;} public void setEmpreendimentoId(Long v){empreendimentoId=v;}
    public Long getUnidadeId(){return unidadeId;} public void setUnidadeId(Long v){unidadeId=v;} public Long getClienteId(){return clienteId;} public void setClienteId(Long v){clienteId=v;}
    public String getOrigemTipo(){return origemTipo;} public void setOrigemTipo(String v){origemTipo=v;} public String getOrigemDescricao(){return origemDescricao;} public void setOrigemDescricao(String v){origemDescricao=v;}
    public Integer getNumero(){return numero;} public void setNumero(Integer v){numero=v;} public Integer getTotalParcelas(){return totalParcelas;} public void setTotalParcelas(Integer v){totalParcelas=v;}
    public LocalDate getVencimento(){return vencimento;} public void setVencimento(LocalDate v){vencimento=v;} public BigDecimal getValor(){return valor;} public void setValor(BigDecimal v){valor=v;}
    public BigDecimal getValorPago(){return valorPago;} public void setValorPago(BigDecimal v){valorPago=v;} public LocalDate getDataPagamento(){return dataPagamento;} public void setDataPagamento(LocalDate v){dataPagamento=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;} public String getRegrasInadimplenciaJson(){return regrasInadimplenciaJson;} public void setRegrasInadimplenciaJson(String v){regrasInadimplenciaJson=v;}
    public Long getVersao(){return versao;} public LocalDateTime getCriadoEm(){return criadoEm;} public LocalDateTime getAtualizadoEm(){return atualizadoEm;}
}
