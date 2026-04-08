package com.bloc.app.repository;

import java.util.UUID;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ProfileRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public ProfileRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean bootstrapProfile(UUID profileId, String email, String username, String fullName) {
        int rowsInserted = jdbcTemplate.update(
                """
                insert into profiles (
                    id,
                    username,
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
}
