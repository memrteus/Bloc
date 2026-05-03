package com.bloc.app.repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.bloc.app.dto.CreateSidequestRequest;
import com.bloc.app.model.Sidequest;

@Repository
public class SidequestRepository {

    private static final RowMapper<SidequestRow> SIDEQUEST_ROW_MAPPER = (resultSet, rowNum) -> new SidequestRow(
            resultSet.getObject("id", UUID.class),
            resultSet.getObject("creator_id", UUID.class),
            resultSet.getString("title"),
            resultSet.getString("description"),
            resultSet.getString("category"),
            resultSet.getString("location_name"),
            resultSet.getBigDecimal("latitude"),
            resultSet.getBigDecimal("longitude"),
            toInstant(resultSet, "starts_at"),
            toInstant(resultSet, "expires_at"),
            resultSet.getObject("max_participants", Integer.class),
            resultSet.getString("status"),
            resultSet.getBigDecimal("distance_miles"),
            toInstant(resultSet, "created_at"),
            toInstant(resultSet, "updated_at"));

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public SidequestRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean profileExists(UUID profileId) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from profiles where id = :profileId",
                Map.of("profileId", profileId),
                Integer.class);
        return count != null && count > 0;
    }

    public List<Sidequest> findDiscoverableSidequestsOrderByCreatedAtDesc(
            String search,
            String category,
            Double latitude,
            Double longitude,
            double radiusMiles,
            int limit,
            int offset) {
        DiscoveryQuery discoveryQuery = buildDiscoverableSidequestsQuery(search, category, latitude, longitude, radiusMiles, limit, offset);

        List<SidequestRow> rows = jdbcTemplate.query(
                discoveryQuery.sql(),
                discoveryQuery.parameters(),
                SIDEQUEST_ROW_MAPPER);

        return rows.stream()
                .map(row -> new Sidequest(
                        row.id(),
                        row.creatorId(),
                        row.title(),
                        row.description(),
                        row.category(),
                        row.locationName(),
                        row.latitude(),
                        row.longitude(),
                        row.startsAt(),
                        row.expiresAt(),
                        row.maxParticipants(),
                        row.status(),
                        row.distanceMiles(),
                        row.createdAt(),
                        row.updatedAt(),
                        getParticipantUserIds(row.id()),
                        getParticipantDisplayNames(row.id())))
                .toList();
    }

    DiscoveryQuery buildDiscoverableSidequestsQuery(
            String search,
            String category,
            Double latitude,
            Double longitude,
            double radiusMiles,
            int limit,
            int offset) {
        String searchPattern = search != null ? "%" + search.toLowerCase() + "%" : null;
        String normalizedCategory = category != null ? category.toLowerCase() : null;
        boolean hasLocationFilter = latitude != null && longitude != null;
        String distanceExpression = """
                3958.8 * acos(least(1.0, greatest(-1.0,
                    cos(radians(:lat)) *
                    cos(radians(s.latitude::double precision)) *
                    cos(radians(s.longitude::double precision) - radians(:lng)) +
                    sin(radians(:lat)) *
                    sin(radians(s.latitude::double precision))
                )))
                """;
        StringBuilder sql = new StringBuilder("""
                select
                    s.id,
                    s.creator_id,
                    s.title,
                    s.description,
                    s.category,
                    s.location_name,
                    s.latitude,
                    s.longitude,
                    s.starts_at,
                    s.expires_at,
                    s.max_participants,
                    s.status,
                """);

        if (hasLocationFilter) {
            sql.append(distanceExpression).append(" as distance_miles,\n");
        } else {
            sql.append("                    null::numeric as distance_miles,\n");
        }

        sql.append("""
                    s.created_at,
                    s.updated_at
                from sidequests s
                where s.status = 'active'
                  and (s.expires_at is null or s.expires_at > now())
                """);

        MapSqlParameterSource parameters = new MapSqlParameterSource();

        if (hasLocationFilter) {
            sql.append("""
                      and s.latitude is not null
                      and s.longitude is not null
                      and (
                    """);
            sql.append(distanceExpression);
            sql.append("""
                      ) <= :radiusMiles
                    """);
            parameters.addValue("lat", latitude);
            parameters.addValue("lng", longitude);
            parameters.addValue("radiusMiles", radiusMiles);
        }

        if (normalizedCategory != null) {
            sql.append("""
                      and lower(s.category) = :category
                    """);
            parameters.addValue("category", normalizedCategory);
        }

        if (searchPattern != null) {
            sql.append("""
                      and (
                        lower(s.title) like :searchPattern
                        or lower(s.description) like :searchPattern
                        or lower(s.location_name) like :searchPattern
                      )
                    """);
            parameters.addValue("searchPattern", searchPattern);
        }

        if (hasLocationFilter) {
            sql.append("""
                    order by distance_miles asc, s.created_at desc
                    limit :limit
                    offset :offset
                    """);
        } else {
            sql.append("""
                    order by s.created_at desc
                    limit :limit
                    offset :offset
                    """);
        }
        parameters.addValue("limit", limit);
        parameters.addValue("offset", offset);

        return new DiscoveryQuery(sql.toString(), parameters);
    }

    public UUID insertSidequest(
            CreateSidequestRequest request,
            UUID creatorId,
            Instant startsAt,
            Instant expiresAt,
            Integer maxParticipants) {
        UUID sidequestId = UUID.randomUUID();

        MapSqlParameterSource parameters = new MapSqlParameterSource()
                .addValue("id", sidequestId)
                .addValue("creatorId", creatorId)
                .addValue("title", request.title())
                .addValue("description", request.description())
                .addValue("category", request.category())
                .addValue("locationName", request.locationName())
                .addValue("latitude", request.latitude())
                .addValue("longitude", request.longitude())
                .addValue("startsAt", OffsetDateTime.ofInstant(startsAt, ZoneOffset.UTC))
                .addValue("expiresAt", OffsetDateTime.ofInstant(expiresAt, ZoneOffset.UTC))
                .addValue("maxParticipants", maxParticipants)
                .addValue("status", "active");

        jdbcTemplate.update(
                """
                insert into sidequests (
                    id,
                    creator_id,
                    title,
                    description,
                    category,
                    location_name,
                    latitude,
                    longitude,
                    starts_at,
                    expires_at,
                    max_participants,
                    status,
                    created_at,
                    updated_at
                ) values (
                    :id,
                    :creatorId,
                    :title,
                    :description,
                    :category,
                    :locationName,
                    :latitude,
                    :longitude,
                    :startsAt,
                    :expiresAt,
                    :maxParticipants,
                    :status,
                    now(),
                    now()
                )
                """,
                parameters);

        return sidequestId;
    }

    public boolean addParticipant(UUID sidequestId, UUID userId, String role) {
        int rowsInserted = jdbcTemplate.update(
                """
                insert into sidequest_participants (
                    id,
                    sidequest_id,
                    user_id,
                    role,
                    joined_at
                ) values (
                    :id,
                    :sidequestId,
                    :userId,
                    :role,
                    now()
                )
                on conflict (sidequest_id, user_id) do nothing
                """,
                new MapSqlParameterSource()
                        .addValue("id", UUID.randomUUID())
                        .addValue("sidequestId", sidequestId)
                        .addValue("userId", userId)
                        .addValue("role", role));

        return rowsInserted > 0;
    }

    public boolean sidequestExists(UUID sidequestId) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from sidequests where id = :sidequestId",
                Map.of("sidequestId", sidequestId),
                Integer.class);
        return count != null && count > 0;
    }

    public boolean participantExists(UUID sidequestId, UUID userId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                select count(*)
                from sidequest_participants
                where sidequest_id = :sidequestId
                  and user_id = :userId
                """,
                new MapSqlParameterSource()
                        .addValue("sidequestId", sidequestId)
                        .addValue("userId", userId),
                Integer.class);
        return count != null && count > 0;
    }

    public Sidequest getRequiredSidequest(UUID sidequestId) {
        SidequestRow row = jdbcTemplate.queryForObject(
                buildRequiredSidequestQuery(),
                Map.of("sidequestId", sidequestId),
                SIDEQUEST_ROW_MAPPER);

        return new Sidequest(
                row.id(),
                row.creatorId(),
                row.title(),
                row.description(),
                row.category(),
                row.locationName(),
                row.latitude(),
                row.longitude(),
                row.startsAt(),
                row.expiresAt(),
                row.maxParticipants(),
                row.status(),
                row.distanceMiles(),
                row.createdAt(),
                row.updatedAt(),
                getParticipantUserIds(sidequestId),
                getParticipantDisplayNames(sidequestId));
    }

    String buildRequiredSidequestQuery() {
        return """
                select
                    id,
                    creator_id,
                    title,
                    description,
                    category,
                    location_name,
                    latitude,
                    longitude,
                    starts_at,
                    expires_at,
                    max_participants,
                    status,
                    null::numeric as distance_miles,
                    created_at,
                    updated_at
                from sidequests
                where id = :sidequestId
                """;
    }

    private List<UUID> getParticipantUserIds(UUID sidequestId) {
        return jdbcTemplate.query(
                """
                select user_id
                from sidequest_participants
                where sidequest_id = :sidequestId
                order by joined_at asc
                """,
                Map.of("sidequestId", sidequestId),
                (resultSet, rowNum) -> resultSet.getObject("user_id", UUID.class));
    }

    private List<String> getParticipantDisplayNames(UUID sidequestId) {
        return jdbcTemplate.query(
                """
                select coalesce(
                    nullif(trim(p.full_name), ''),
                    nullif(trim(p.user_name), ''),
                    nullif(trim(p.umass_email), ''),
                    sp.user_id::text
                ) as display_name
                from sidequest_participants sp
                left join profiles p on p.id = sp.user_id
                where sp.sidequest_id = :sidequestId
                order by sp.joined_at asc
                """,
                Map.of("sidequestId", sidequestId),
                (resultSet, rowNum) -> resultSet.getString("display_name"));
    }

    private static Instant toInstant(ResultSet resultSet, String columnName) throws SQLException {
        OffsetDateTime value = resultSet.getObject(columnName, OffsetDateTime.class);
        return value != null ? value.toInstant() : null;
    }

    private record SidequestRow(
            UUID id,
            UUID creatorId,
            String title,
            String description,
            String category,
            String locationName,
            BigDecimal latitude,
            BigDecimal longitude,
            Instant startsAt,
            Instant expiresAt,
            Integer maxParticipants,
            String status,
            BigDecimal distanceMiles,
            Instant createdAt,
            Instant updatedAt) {
    }

    record DiscoveryQuery(String sql, MapSqlParameterSource parameters) {
    }
}
