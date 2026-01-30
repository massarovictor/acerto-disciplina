import re
from datetime import datetime
import uuid

# Configuration - CLASS C
CLASS_ID = 'f17d4ae4-8861-42c8-8380-76533dae9c32'
OWNER_ID = '211dfeb8-7476-4361-92b3-e9e7aa0a7808'
INPUT_FILE = r'C:\Users\victo\Documents\acerto-disciplina-main\students_raw.txt'
OUTPUT_FILE = r'C:\Users\victo\Documents\acerto-disciplina-main\insert_students.sql'

def parse_date(date_str):
    return datetime.strptime(date_str, '%d/%m/%Y').strftime('%Y-%m-%d')

def generate_sql():
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]

    students = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check for Name pattern: "1 - ANA..." or "10 - EZEQUIEL..."
        name_match = re.match(r'^(\d+)\s+-\s+(.+)$', line)
        
        if name_match:
            census_id = None
            enrollment = None
            
            if i > 0:
                prev1 = lines[i-1]
                if re.match(r'^\d{12}$', prev1): # Census ID likely
                    census_id = prev1
                    if i > 1:
                        prev2 = lines[i-2]
                        if re.match(r'^\d+$', prev2): # Mat Sige likely
                            enrollment = prev2
                elif re.match(r'^\d{7,8}$', prev1): # Mat Sige likely
                    enrollment = prev1
            
            # Get Name
            name = name_match.group(2)
            
            # Get next lines for Date and Gender
            birth_date = None
            gender = None
            
            if i + 1 < len(lines):
                birth_date = parse_date(lines[i+1])
            
            if i + 2 < len(lines):
                gender = lines[i+2]
            
            if name and birth_date:
                student_id = str(uuid.uuid4())
                students.append({
                    'id': student_id,
                    'owner_id': OWNER_ID,
                    'class_id': CLASS_ID,
                    'name': name.replace("'", "''"), # Escape quotes
                    'birth_date': birth_date,
                    'gender': gender,
                    'enrollment': enrollment,
                    'census_id': census_id,
                    'status': 'active',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                })
            
            # Move index forward
            i += 3 
        else:
            i += 1

    # Generate SQL
    sql_statements = []
    sql_statements.append('-- SQL generated automatically')
    sql_statements.append('BEGIN;')
    
    # Class C Creation
    sql_statements.append('-- Criar a turma (caso ainda não tenha criado)')
    sql_statements.append('INSERT INTO "public"."classes" ("id", "owner_id", "name", "series", "letter", "course", "director_email", "active", "start_year", "current_year", "start_year_date", "start_calendar_year", "end_calendar_year", "archived", "template_id")')
    sql_statements.append("VALUES ('f17d4ae4-8861-42c8-8380-76533dae9c32', '211dfeb8-7476-4361-92b3-e9e7aa0a7808', '2026-2028 Técnico em Comércio C', '1º ano', 'C', 'Técnico em Comércio', 'evanilson.nunes@prof.ce.gov.br', true, 1, 1, '2026-02-01', 2026, 2028, false, '36d29be5-5a6b-447b-8076-8f0c54c9c1ab')")
    sql_statements.append('ON CONFLICT (id) DO NOTHING;')
    sql_statements.append('')

    sql_statements.append('-- Inserir Alunos')
    
    values_list = []
    for s in students:
        vals = [
            f"'{s['id']}'",
            f"'{s['owner_id']}'",
            f"'{s['class_id']}'",
            f"'{s['name']}'",
            f"'{s['birth_date']}'",
            f"'{s['gender']}'",
            f"'{s['status']}'",
            # enrollment (9)
            # census_id (10)
        ]
        
        enrollment_val = f"'{s['enrollment']}'" if s['enrollment'] else "NULL"
        census_val = f"'{s['census_id']}'" if s['census_id'] else "NULL"

        # Correctly formatted row for bulk insert
        row_vals = f"('{s['id']}', '{s['owner_id']}', '{s['class_id']}', '{s['name']}', '{s['birth_date']}', '{s['gender']}', '{s['status']}', NOW(), NOW(), {enrollment_val}, {census_val})"
        values_list.append(row_vals)
        
    
    # Batch the insert
    if values_list:
        sql = f'INSERT INTO "public"."students" (id, owner_id, class_id, name, birth_date, gender, status, created_at, updated_at, enrollment, census_id) VALUES\n'
        sql += ',\n'.join(values_list) + ';'
        sql_statements.append(sql)
        
    sql_statements.append('COMMIT;')
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))
        
    print(f"Generated SQL for {len(students)} students.")

if __name__ == '__main__':
    generate_sql()
