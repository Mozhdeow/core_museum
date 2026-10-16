# Build with a minimal context containing only the two SQL tests and migrations.
# The Supabase image is Alpine/musl: do not copy Node from a Debian/glibc image.
# Run with --network none; read-only runs need tmpfs at /work/.tmp, /tmp and /run/postgresql.
FROM node:24-alpine3.23 AS node
FROM public.ecr.aws/supabase/postgres:17.6.1.171
USER root
COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN apk add --no-cache libstdc++ \
    && node --version \
    && /nix/var/nix/profiles/default/bin/initdb --version \
    && mkdir -p /work/.tmp \
    && chown postgres:postgres /work/.tmp
WORKDIR /work
COPY tests/admin-users-sql.test.ts tests/auth-roles-sql.test.ts ./tests/
COPY supabase/migrations/ ./supabase/migrations/
ENV CORE_TEST_PG_BIN=/usr/bin
USER postgres
ENTRYPOINT ["node"]
CMD ["--test", "--test-concurrency=1", "--test-reporter=spec", "tests/admin-users-sql.test.ts", "tests/auth-roles-sql.test.ts"]
