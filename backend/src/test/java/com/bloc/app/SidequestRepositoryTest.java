package com.bloc.app.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

class SidequestRepositoryTest {

    private final SidequestRepository sidequestRepository = new SidequestRepository(Mockito.mock(NamedParameterJdbcTemplate.class));

    @Test
    void buildDiscoverableSidequestsQueryIncludesBaseFilteringAndPagination() {
        SidequestRepository.DiscoveryQuery query = sidequestRepository.buildDiscoverableSidequestsQuery(null, null, 20, 0);

        assertTrue(query.sql().contains("where status = 'active'"));
        assertTrue(query.sql().contains("(expires_at is null or expires_at > now())"));
        assertTrue(query.sql().contains("order by created_at desc"));
        assertTrue(query.sql().contains("limit :limit"));
        assertTrue(query.sql().contains("offset :offset"));
        assertEquals(20, query.parameters().getValue("limit"));
        assertEquals(0, query.parameters().getValue("offset"));
    }

    @Test
    void buildDiscoverableSidequestsQueryAddsSearchWhenProvided() {
        SidequestRepository.DiscoveryQuery query = sidequestRepository.buildDiscoverableSidequestsQuery("library", null, 20, 0);

        assertTrue(query.sql().contains("lower(title) like :searchPattern"));
        assertTrue(query.sql().contains("lower(description) like :searchPattern"));
        assertTrue(query.sql().contains("lower(location_name) like :searchPattern"));
        assertEquals("%library%", query.parameters().getValue("searchPattern"));
    }

    @Test
    void buildDiscoverableSidequestsQueryAddsCategoryWhenProvided() {
        SidequestRepository.DiscoveryQuery query = sidequestRepository.buildDiscoverableSidequestsQuery(null, "study", 20, 0);

        assertTrue(query.sql().contains("and lower(category) = :category"));
        assertEquals("study", query.parameters().getValue("category"));
    }

    @Test
    void buildDiscoverableSidequestsQuerySkipsOptionalFiltersWhenMissing() {
        SidequestRepository.DiscoveryQuery query = sidequestRepository.buildDiscoverableSidequestsQuery(null, null, 20, 0);
        MapSqlParameterSource parameters = query.parameters();

        assertFalse(query.sql().contains("lower(category) = :category"));
        assertFalse(query.sql().contains("lower(title) like :searchPattern"));
        assertFalse(parameters.hasValue("category"));
        assertFalse(parameters.hasValue("searchPattern"));
    }
}
