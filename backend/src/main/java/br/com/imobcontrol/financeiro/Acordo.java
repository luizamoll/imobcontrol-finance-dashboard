package br.com.imobcontrol.financeiro;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="acordos")
public class Acordo {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="empresa_id", nullable=false) private Long empresaId;
    @Column(name="venda_id", nullable=false) private Long vendaId;
    @Column(name="cliente_id", nullable=false) private Long clienteId;
    @Column(name="data_acordo", nullable=false) private LocalDate dataAcordo;
    @Column(name="valor_original", nullable=false, precision=19, scale=2) private BigDecimal valorOriginal;
    @Column(name="valor_acordo", nullable=false, precision=19, scale=2) private BigDecimal valorAcordo;
    @Column(name="entrada_valor", nullable=false, precision=19, scale=2) private BigDecimal entradaValor=BigDecimal.ZERO;
    @Column(name="quantidade_parcelas", nullable=false) private Integer quantidadeParcelas;
    @Column(name="primeiro_vencimento", nullable=false) private LocalDate primeiroVencimento;
    @Column(columnDefinition="TEXT") private String observacoes;
    @Column(nullable=false, length=30) private String status="ativo";
    @Column(name="criado_por_usuario_id", nullable=false) private Long criadoPorUsuarioId;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm;
    @PrePersist void prePersist(){criadoEm=LocalDateTime.now();}
    public Long getId(){return id;}
    public Long getEmpresaId(){return empresaId;} public void setEmpresaId(Long v){empresaId=v;}
    public Long getVendaId(){return vendaId;} public void setVendaId(Long v){vendaId=v;}
    public Long getClienteId(){return clienteId;} public void setClienteId(Long v){clienteId=v;}
    public LocalDate getDataAcordo(){return dataAcordo;} public void setDataAcordo(LocalDate v){dataAcordo=v;}
    public BigDecimal getValorOriginal(){return valorOriginal;} public void setValorOriginal(BigDecimal v){valorOriginal=v;}
    public BigDecimal getValorAcordo(){return valorAcordo;} public void setValorAcordo(BigDecimal v){valorAcordo=v;}
    public BigDecimal getEntradaValor(){return entradaValor;} public void setEntradaValor(BigDecimal v){entradaValor=v;}
    public Integer getQuantidadeParcelas(){return quantidadeParcelas;} public void setQuantidadeParcelas(Integer v){quantidadeParcelas=v;}
    public LocalDate getPrimeiroVencimento(){return primeiroVencimento;} public void setPrimeiroVencimento(LocalDate v){primeiroVencimento=v;}
    public String getObservacoes(){return observacoes;} public void setObservacoes(String v){observacoes=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public Long getCriadoPorUsuarioId(){return criadoPorUsuarioId;} public void setCriadoPorUsuarioId(Long v){criadoPorUsuarioId=v;}
    public LocalDateTime getCriadoEm(){return criadoEm;}
}
