package com.bloc.app;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import com.bloc.app.repository.SidequestRepository;

@SpringBootTest(properties = "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration")
class BlocApplicationTests {

    @MockBean
    private SidequestRepository sidequestRepository;

    @MockBean
    private JwtDecoder jwtDecoder;

    @Test
    void contextLoads() {
    }
}
