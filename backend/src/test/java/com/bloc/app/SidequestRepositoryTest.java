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
        SidequestRepository.DiscoveryQuery query = sidequestRepository.buildDiscoverableSidequestsQuery(null, null, null, null, 25.0, 20, 0);

        assertTrue(query.sql().contains("where s.status = 'active'"));
        assertTrue(query.sql().contains("(s.expires_at is null or s.expires_at > now())"));
        assertTrue(query.sql().contains("order by s.created_at desc"));
        assertTrue(query.sql().contains("limit :limit"));
        assertTrue(query.sql().contains("offset :offset"));
        assertEquals(20, query.parameters().getValue("limit"));
        assertEquals(0, query.parameters().getValue("offset"));
    }

    @Test
    void buildDiscoverableSidequestsQueryAddsSearchWhenProvided() {
        SidequestRepository.DiscoveryQuery query = sidequestRepository.buildDiscoverableSidequestsQuery("library", null, null, null, 25.0, 20, 0);

        assertTrue(query.sql().contains("lower(s.title) like :searchPattern"));
        assertTrue(query.sql().contains("lower(s.description) like :searchPattern"));
        assertTrue(query.sql().contains("lower(s.location_name) like :searchPattern"));
        assertEquals("%library%", query.parameters().getValue("searchPattern"));
    }

    @Test
    void buildDiscoverableSidequestsQueryAddsCategoryWhenProvided() {
        SidequestRepository.DiscoveryQuery query = sidequestRepository.buildDiscoverableSidequestsQuery(null, "study", null, null, 25.0, 20, 0);

        assertTrue(query.sql().contains("and lower(s.category) = :category"));
        assertEquals("study", query.parameters().getValue("category"));
    }

    @Test
    void buildDiscoverableSidequestsQuerySkipsOptionalFiltersWhenMissing() {
        SidequestRepository.DiscoveryQuery query = sidequestRepository.buildDiscoverableSidequestsQuery(null, null, null, null, 25.0, 20, 0);
        MapSqlParameterSource parameters = query.parameters();

        assertFalse(query.sql().contains("lower(s.category) = :category"));
        assertFalse(query.sql().contains("lower(s.title) like :searchPattern"));
        assertFalse(parameters.hasValue("category"));
        assertFalse(parameters.hasValue("searchPattern"));
    }

    @Test
    void buildDiscoverableSidequestsQueryAddsRadiusFilterAndDistanceSortWhenLocationProvided() {
        SidequestRepository.DiscoveryQuery query = sidequestRepository.buildDiscoverableSidequestsQuery(
                null,
                null,
                42.3868,
                -72.5301,
                25.0,
                20,
                0);

        assertTrue(query.sql().contains("as distance_miles"));
        assertTrue(query.sql().contains("s.latitude is not null"));
        assertTrue(query.sql().contains("s.longitude is not null"));
        assertTrue(query.sql().contains("<= :radiusMiles"));
        assertTrue(query.sql().contains("order by distance_miles asc"));
        assertEquals(42.3868, query.parameters().getValue("lat"));
        assertEquals(-72.5301, query.parameters().getValue("lng"));
        assertEquals(25.0, query.parameters().getValue("radiusMiles"));
    }

    @Test
    void buildRequiredSidequestQueryIncludesDistanceAliasForSharedMapper() {
        String sql = sidequestRepository.buildRequiredSidequestQuery();

        assertTrue(sql.contains("null::numeric as distance_miles"));
        assertTrue(sql.contains("where id = :sidequestId"));
    }

    @Test
    void buildJoinedSidequestsQueryFiltersByParticipantUserIdOnly() {
        String sql = sidequestRepository.buildJoinedSidequestsQuery();

        assertTrue(sql.contains("from sidequest_participants sp"));
        assertTrue(sql.contains("join sidequests s on s.id = sp.sidequest_id"));
        assertTrue(sql.contains("where sp.user_id = :userId"));
        assertFalse(sql.contains("s.creator_id = :userId"));
        assertTrue(sql.contains("order by sp.joined_at desc"));
    }
}
