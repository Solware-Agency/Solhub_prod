/*
  # Generate medical record code in DB (function + trigger)

  - Genera el código en la BD de forma atómica e ignorando RLS
  - No usa tablas auxiliares; calcula el siguiente correlativo desde medical_records_clean
  - Evita condiciones de carrera usando pg_advisory_xact_lock por (tipo, año, mes)
  - Asigna el código en un BEFORE INSERT trigger si NEW.code viene null o vacío
*/

-- Function to generate code directly from existing rows
create or replace function generate_medical_record_code_from_table(
  exam_type_input text,
  case_date_input timestamptz
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  case_type_num smallint;
  yyyy smallint;
  mm smallint;
  year_since_2000 text;
  month_letter text;
  next_counter int;
begin
  -- Map exam type (acepta variantes con/sin acentos y mayúsculas)
  case
    when lower(replace(replace(exam_type_input, 'í', 'i'), 'ó', 'o')) like 'citolog%' then case_type_num := 1;
    when lower(exam_type_input) = 'biopsia' then case_type_num := 2;
    when lower(replace(exam_type_input, 'í', 'i')) like 'inmunohistoquim%' then case_type_num := 3;
    else
      raise exception 'Unknown exam type: %', exam_type_input using errcode = '22023';
  end case;

  yyyy := extract(year from case_date_input)::smallint;
  mm := extract(month from case_date_input)::smallint;

  year_since_2000 := lpad((yyyy - 2000)::text, 2, '0');
  month_letter := substr('ABCDEFGHIJKL', mm, 1);

  -- Lock lógico por (tipo, año, mes) para evitar carreras
  perform pg_advisory_xact_lock(hashtext(concat('mrcode|', case_type_num, '|', yyyy, '|', mm)));

  -- Buscar el máximo contador existente en el patrón [tipo][yy][nnn][letra]
  select coalesce(max((substr(code, 4, 3))::int), 0)
    into next_counter
  from medical_records_clean
  where length(code) = 7
    and substr(code, 1, 1) = case_type_num::text
    and substr(code, 2, 2) = year_since_2000
    and substr(code, 7, 1) = month_letter;

  next_counter := next_counter + 1;

  return concat(
    case_type_num::text,
    year_since_2000,
    lpad(next_counter::text, 3, '0'),
    month_letter
  );
end;
$$;

-- No exponer la función públicamente (la usa el trigger)
revoke all on function generate_medical_record_code_from_table(text, timestamptz) from public;

-- Trigger function to set NEW.code before insert
create or replace function set_medical_record_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  case_ts timestamptz;
begin
  -- Determinar fecha del caso; si no viene, usar now()
  begin
    case_ts := coalesce(new.date::timestamptz, now());
  exception when others then
    case_ts := now();
  end;

  if new.code is null or new.code = '' then
    new.code := generate_medical_record_code_from_table(new.exam_type, case_ts);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_medical_record_code on medical_records_clean;
create trigger trg_set_medical_record_code
before insert on medical_records_clean
for each row execute function set_medical_record_code();


