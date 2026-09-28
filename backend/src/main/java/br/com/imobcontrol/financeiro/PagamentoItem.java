package br.com.imobcontrol.financeiro;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="pagamento_itens")
public class PagamentoItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="empresa_id", nullable=false) private Long empresaId;
    @Column(name="venda_id", nullable=false) private Long vendaId;
    @Column(nullable=false, length=40) private String tipo;
    @Column(length=240) private String descricao;
    @Column(nullable=false, precision=19, scale=2) private BigDecimal valor;
    @Column(nullable=false) private Integer parcelas=1;
    @Column(name="primeiro_vencimento", nullable=false) private LocalDate primeiroVencimento;
    @Column(nullable=false, length=40) private String status;
    @Column(columnDefinition="TEXT") private String observacoes;
    @Column(name="bem_json", columnDefinition="TEXT") private String bemJson;
    @Column(name="criado_em", nullable=false) private LocalDateTime criadoEm;
    @PrePersist void prePersist(){criadoEm=LocalDateTime.now();}
    public Long getId(){return id;} public Long getEmpresaId(){return empresaId;} public void setEmpresaId(Long v){empresaId=v;}
    public Long getVendaId(){return vendaId;} public void setVendaId(Long v){vendaId=v;} public String getTipo(){return tipo;} public void setTipo(String v){tipo=v;}
    public String getDescricao(){return descricao;} public void setDescricao(String v){descricao=v;} public BigDecimal getValor(){return valor;} public void setValor(BigDecimal v){valor=v;}
    public Integer getParcelas(){return parcelas;} public void setParcelas(Integer v){parcelas=v;} public LocalDate getPrimeiroVencimento(){return primeiroVencimento;} public void setPrimeiroVencimento(LocalDate v){primeiroVencimento=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;} public String getObservacoes(){return observacoes;} public void setObservacoes(String v){observacoes=v;}
    public String getBemJson(){return bemJson;} public void setBemJson(String v){bemJson=v;}
}
