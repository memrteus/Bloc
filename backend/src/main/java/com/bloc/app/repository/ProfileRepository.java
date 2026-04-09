package com.bloc.app.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ProfileRepository {

    private static final RowMapper<ProfileSummary> PROFILE_SUMMARY_ROW_MAPPER = (resultSet, rowNum) -> mapProfileSummary(resultSet);
    private static final RowMapper<CurrentUserProfile> CURRENT_USER_PROFILE_ROW_MAPPER = (resultSet, rowNum) -> mapCurrentUserProfile(resultSet);

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public ProfileRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean bootstrapProfile(UUID profileId, String email, String username, String fullName) {
        int rowsInserted = jdbcTemplate.update(
                """
                insert into profiles (
                    id,
                    user_name,
                    full_name,
                    umass_email,
                    created_at,
                    updated_at
                ) values (
                    :id,
                    :username,
                    :fullName,
                    :email,
                    now(),
                    now()
                )
                on conflict (id) do nothing
                """,
                new MapSqlParameterSource()
                        .addValue("id", profileId)
                        .addValue("username", username)
                        .addValue("fullName", fullName)
                        .addValue("email", email));

        return rowsInserted > 0;
    }

    public Optional<CurrentUserProfile> findCurrentUserProfile(UUID profileId) {
        return jdbcTemplate.query(
                """
                select
                    user_name as username,
                    full_name,
                    umass_email,
                    avatar_url,
                    bio
                from profiles
                where id = :id
                """,
                new MapSqlParameterSource().addValue("id", profileId),
                CURRENT_USER_PROFILE_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    public Optional<ProfileSummary> findProfileById(UUID profileId) {
        return jdbcTemplate.query(
                """
                select
                    id,
                    user_name as username,
                    full_name,
                    umass_email,
                    avatar_url,
                    bio
                from profiles
                where id = :id
                """,
                new MapSqlParameterSource().addValue("id", profileId),
                PROFILE_SUMMARY_ROW_MAPPER)
                .stream()
                .findFirst();
    }

    private static CurrentUserProfile mapCurrentUserProfile(ResultSet resultSet) throws SQLException {
        return new CurrentUserProfile(
                resultSet.getString("username"),
                resultSet.getString("full_name"),
                resultSet.getString("umass_email"),
                resultSet.getString("avatar_url"),
                resultSet.getString("bio"));
    }

    private static ProfileSummary mapProfileSummary(ResultSet resultSet) throws SQLException {
        return new ProfileSummary(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("username"),
                resultSet.getString("full_name"),
                resultSet.getString("umass_email"),
                resultSet.getString("avatar_url"),
                resultSet.getString("bio"));
    }

    public record CurrentUserProfile(
            String username,
            String fullName,
            String umassEmail,
            String avatarUrl,
            String bio) {
    }

    public record ProfileSummary(
            UUID id,
            String username,
            String fullName,
            String umassEmail,
            String avatarUrl,
            String bio) {
    }
}
