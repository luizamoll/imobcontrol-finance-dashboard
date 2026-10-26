package br.com.imobcontrol.dividendos;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.math.BigDecimal;

@Embeddable
public class ParticipanteDividendoEmbeddable {

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(nullable = false, precision = 7, scale = 4)
    private BigDecimal percentual;

    protected ParticipanteDividendoEmbeddable() {
    }

    public ParticipanteDividendoEmbeddable(String nome, BigDecimal percentual) {
        this.nome = nome;
        this.percentual = percentual;
    }

    public String getNome() {
        return nome;
    }

    public BigDecimal getPercentual() {
        return percentual;
    }
}
