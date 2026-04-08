package com.bloc.app;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.Date;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import com.bloc.app.config.SupabaseAuthProperties;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;

class SupabaseAuthPropertiesTest {

    private HttpServer httpServer;

    @BeforeEach
    void setUp() throws IOException {
        httpServer = HttpServer.create(new InetSocketAddress(0), 0);
    }

    @AfterEach
    void tearDown() {
        if (httpServer != null) {
            httpServer.stop(0);
        }
    }

    @Test
    void buildJwtDecoderSupportsEs256TokensFromJwkSet() throws Exception {
        ECKey signingKey = new ECKeyGenerator(Curve.P_256)
                .algorithm(JWSAlgorithm.ES256)
                .keyUse(KeyUse.SIGNATURE)
                .keyID("test-es256-key")
                .generate();

        httpServer.createContext("/auth/v1/.well-known/jwks.json", exchange -> {
            byte[] responseBody = new JWKSet(signingKey.toPublicJWK()).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, responseBody.length);
            try (OutputStream outputStream = exchange.getResponseBody()) {
                outputStream.write(responseBody);
            }
        });
        httpServer.start();

        SupabaseAuthProperties properties = new SupabaseAuthProperties();
        properties.setUrl("http://localhost:" + httpServer.getAddress().getPort());
        properties.setAudience("authenticated");

        JwtDecoder decoder = properties.buildJwtDecoder();
        if (decoder instanceof NimbusJwtDecoder nimbusJwtDecoder) {
            nimbusJwtDecoder.setJwtValidator(properties.buildTokenValidator());
        }

        String token = signedEs256Token(signingKey, properties.resolvedIssuer());
        var decoded = decoder.decode(token);

        assertEquals("11111111-1111-1111-1111-111111111111", decoded.getSubject());
        assertEquals("student@umass.edu", decoded.getClaimAsString("email"));
        assertEquals("authenticated", decoded.getAudience().getFirst());
    }

    private String signedEs256Token(ECKey signingKey, String issuer) throws JOSEException {
        Instant now = Instant.now();
        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .subject("11111111-1111-1111-1111-111111111111")
                .audience("authenticated")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(300)))
                .claim("email", "student@umass.edu")
                .build();

        SignedJWT signedJwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.ES256)
                        .keyID(signingKey.getKeyID())
                        .build(),
                claimsSet);
        signedJwt.sign(new ECDSASigner(signingKey));
        return signedJwt.serialize();
    }
}
