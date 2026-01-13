/**
 * StudentMetricsSlide - Slide de Métricas do Aluno
 * Exibe resumo visual do desempenho individual do aluno.
 * Usa inline styles para compatibilidade com exportação PDF.
 */

import { useMemo } from "react";
import { TrendingUp, AlertTriangle, Trophy, Users } from "lucide-react";
import { Student, Grade, Incident } from "@/types";
import { SlideLayout } from "./SlideLayout";
import {
  REPORT_COLORS,
  STATUS_COLORS,
  classifyStudent,
  StudentClassification,
} from "@/lib/reportDesignSystem";

interface StudentMetricsSlideProps {
  student: Student;
  grades: Grade[];
  incidents: Incident[];
  period: string;
  position: number;
  totalStudents: number;
}

const CLASSIFICATION_LABELS: Record<StudentClassification, string> = {
  excellence: "Excelência",
  approved: "Aprovado",
  attention: "Atenção",
  critical: "Crítico",
};

export const StudentMetricsSlide = ({
  student,
  grades,
  incidents,
  period,
  position,
  totalStudents,
}: StudentMetricsSlideProps) => {
  const metrics = useMemo(() => {
    const filteredGrades =
      period === "all" ? grades : grades.filter((g) => g.quarter === period);

    const studentGrades = filteredGrades.filter(
      (g) => g.studentId === student.id,
    );
    const averageGrade =
      studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => sum + g.grade, 0) /
          studentGrades.length
        : 0;

    // Calculate subject averages for classification
    const subjects = [...new Set(studentGrades.map((g) => g.subject))];
    const avgBySubject = subjects.map((sub) => {
      const subGrades = studentGrades.filter((g) => g.subject === sub);
      return subGrades.length
        ? subGrades.reduce((s, g) => s + g.grade, 0) / subGrades.length
        : 0;
    });
    const redGradesCount = avgBySubject.filter((a) => a < 6).length;

    const studentIncidents = incidents.filter((i) =>
      i.studentIds.includes(student.id),
    );
    const criticalIncidents = studentIncidents.filter(
      (i) => i.finalSeverity === "grave" || i.finalSeverity === "gravissima",
    ).length;

    const classification = classifyStudent(averageGrade, redGradesCount);
    const statusColors = STATUS_COLORS[classification];

    return {
      averageGrade,
      studentGrades,
      studentIncidents,
      criticalIncidents,
      classification,
      statusColors,
      redGradesCount,
      approvedGradesCount: studentGrades.filter((g) => g.grade >= 6).length,
    };
  }, [grades, incidents, period, student.id]);
  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <SlideLayout
      title="Relatório de Desempenho Individual"
      subtitle={`${period === "all" ? "Ano Letivo Completo" : period} • Posição: ${position}º de ${totalStudents}`}
      footer="MAVIC - Sistema de Acompanhamento Escolar"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 40,
          height: "100%",
        }}
      >
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Student Avatar Card */}
          <div
            style={{
              background: REPORT_COLORS.background.card,
              borderRadius: 20,
              padding: "24px 32px",
              display: "flex",
              alignItems: "center",
              gap: 24,
              border: `1px solid ${REPORT_COLORS.border}`,
              boxShadow: "0 8px 16px -4px rgba(0,0,0,0.05)",
            }}
          >
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.name}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  objectFit: "cover",
                  border: `4px solid ${REPORT_COLORS.primary}`,
                }}
              />
            ) : (
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 70,
                  background: `${REPORT_COLORS.primary}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                  fontWeight: 700,
                  color: REPORT_COLORS.primary,
                  border: `4px solid ${REPORT_COLORS.primary}30`,
                }}
              >
                {initials}
              </div>
            )}
            <div>
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: REPORT_COLORS.text.primary,
                  margin: "0 0 8px",
                }}
              >
                {student.name}
              </p>
              <p
                style={{
                  fontSize: 20,
                  color: REPORT_COLORS.text.secondary,
                  margin: 0,
                }}
              >
                Matrícula: {student.enrollment || "—"}
              </p>
              <div
                style={{
                  marginTop: 16,
                  padding: "8px 24px",
                  borderRadius: 30,
                  background: metrics.statusColors.bg,
                  color: metrics.statusColors.text,
                  fontSize: 20,
                  fontWeight: 700,
                  display: "inline-block",
                  border: `1px solid ${metrics.statusColors.border}`,
                }}
              >
                {CLASSIFICATION_LABELS[metrics.classification]}
              </div>
            </div>
          </div>

          {/* Average Grade Card */}
          <div
            style={{
              background: `linear-gradient(135deg, ${metrics.statusColors.bg} 0%, ${metrics.statusColors.bg}80 100%)`,
              borderRadius: 20,
              padding: "32px 40px",
              border: `2px solid ${metrics.statusColors.border}`,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 24,
                  background: REPORT_COLORS.background.card,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              >
                <TrendingUp size={56} color={metrics.statusColors.solid} />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 22,
                    color: metrics.statusColors.text,
                    margin: "0 0 4px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    opacity: 0.8,
                  }}
                >
                  Média Geral
                </p>
                <p
                  style={{
                    fontSize: 96,
                    fontWeight: 800,
                    color: metrics.statusColors.text,
                    margin: 0,
                    lineHeight: 1,
                    letterSpacing: "-2px",
                  }}
                >
                  {metrics.averageGrade.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* Position Card */}
          <div
            style={{
              background: REPORT_COLORS.background.card,
              borderRadius: 20,
              padding: "24px 32px",
              border: `1px solid ${REPORT_COLORS.border}`,
              boxShadow: "0 8px 16px -4px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: `${REPORT_COLORS.primary}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trophy size={32} color={REPORT_COLORS.primary} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <p
                    style={{
                      fontSize: 20,
                      color: REPORT_COLORS.text.secondary,
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    Posição
                  </p>
                  <p
                    style={{
                      fontSize: 48,
                      fontWeight: 800,
                      color: REPORT_COLORS.text.primary,
                      margin: 0,
                    }}
                  >
                    {position}º{" "}
                    <span
                      style={{
                        fontSize: 24,
                        color: REPORT_COLORS.text.tertiary,
                        fontWeight: 500,
                      }}
                    >
                      de {totalStudents}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: 16,
                borderRadius: 8,
                background: REPORT_COLORS.background.muted,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${((totalStudents - position + 1) / totalStudents) * 100}%`,
                  height: "100%",
                  borderRadius: 8,
                  background: REPORT_COLORS.primary,
                }}
              />
            </div>
            <p
              style={{
                fontSize: 18,
                color: REPORT_COLORS.text.tertiary,
                margin: "16px 0 0",
                textAlign: "right",
              }}
            >
              {position <= totalStudents * 0.3
                ? "🌟 Top 30% da turma"
                : position <= totalStudents * 0.5
                  ? "👍 Acima da média"
                  : "⚠️ Abaixo da média da turma"}
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Incidents Card */}
          <div
            style={{
              background:
                metrics.studentIncidents.length === 0
                  ? STATUS_COLORS.approved.bg
                  : metrics.criticalIncidents > 0
                    ? STATUS_COLORS.critical.bg
                    : STATUS_COLORS.attention.bg,
              borderRadius: 20,
              padding: "24px 32px",
              border: `2px solid ${
                metrics.studentIncidents.length === 0
                  ? STATUS_COLORS.approved.border
                  : metrics.criticalIncidents > 0
                    ? STATUS_COLORS.critical.border
                    : STATUS_COLORS.attention.border
              }`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 32,
                marginBottom: 24,
              }}
            >
              <AlertTriangle
                size={64}
                color={
                  metrics.studentIncidents.length === 0
                    ? STATUS_COLORS.approved.solid
                    : metrics.criticalIncidents > 0
                      ? STATUS_COLORS.critical.solid
                      : STATUS_COLORS.attention.solid
                }
              />
              <div>
                <p
                  style={{
                    fontSize: 20,
                    color: REPORT_COLORS.text.secondary,
                    margin: "0 0 4px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  Ocorrências
                </p>
                <p
                  style={{
                    fontSize: 64,
                    fontWeight: 800,
                    color: REPORT_COLORS.text.primary,
                    margin: 0,
                    lineHeight: 1,
                  }}
                >
                  {metrics.studentIncidents.length}
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 20,
                padding: "16px 24px",
                background: "rgba(255,255,255,0.5)",
                borderRadius: 12,
              }}
            >
              <span style={{ color: REPORT_COLORS.text.secondary }}>
                Graves/Gravíssimas
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 24,
                  color:
                    metrics.criticalIncidents > 0
                      ? STATUS_COLORS.critical.text
                      : REPORT_COLORS.text.primary,
                }}
              >
                {metrics.criticalIncidents}
              </span>
            </div>
          </div>

          {/* Statistics Card */}
          <div
            style={{
              background: REPORT_COLORS.background.card,
              borderRadius: 20,
              padding: "24px 32px",
              border: `1px solid ${REPORT_COLORS.border}`,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 8px 16px -4px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 32,
              }}
            >
              <Users size={32} color={REPORT_COLORS.primary} />
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: REPORT_COLORS.text.primary,
                  margin: 0,
                }}
              >
                Estatísticas de Notas
              </h3>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
                flex: 1,
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background: REPORT_COLORS.background.surface,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: 20, color: REPORT_COLORS.text.secondary }}
                >
                  Total de Notas
                </span>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: REPORT_COLORS.text.primary,
                  }}
                >
                  {metrics.studentGrades.length}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background:
                    metrics.redGradesCount > 0
                      ? STATUS_COLORS.critical.bg
                      : REPORT_COLORS.background.surface,
                  borderRadius: 12,
                  alignItems: "center",
                  border:
                    metrics.redGradesCount > 0
                      ? `1px solid ${STATUS_COLORS.critical.border}`
                      : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    color:
                      metrics.redGradesCount > 0
                        ? STATUS_COLORS.critical.text
                        : REPORT_COLORS.text.secondary,
                  }}
                >
                  Reprovadas (&lt; 6.0)
                </span>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color:
                      metrics.redGradesCount > 0
                        ? STATUS_COLORS.critical.text
                        : REPORT_COLORS.text.primary,
                  }}
                >
                  {metrics.redGradesCount}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background:
                    metrics.approvedGradesCount > 0
                      ? STATUS_COLORS.excellence.bg
                      : REPORT_COLORS.background.surface,
                  borderRadius: 12,
                  alignItems: "center",
                  border:
                    metrics.approvedGradesCount > 0
                      ? `1px solid ${STATUS_COLORS.excellence.border}`
                      : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    color:
                      metrics.approvedGradesCount > 0
                        ? STATUS_COLORS.approved.text
                        : REPORT_COLORS.text.secondary,
                  }}
                >
                  Aprovadas (&gt;= 6.0)
                </span>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color:
                      metrics.approvedGradesCount > 0
                        ? STATUS_COLORS.approved.text
                        : REPORT_COLORS.text.primary,
                  }}
                >
                  {metrics.approvedGradesCount}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendation Card */}
          <div
            style={{
              background: `linear-gradient(to right, ${REPORT_COLORS.primary}10, ${REPORT_COLORS.primary}05)`,
              borderRadius: 20,
              padding: 24,
              border: `1px solid ${REPORT_COLORS.primary}20`,
            }}
          >
            <p
              style={{
                fontSize: 18,
                color: REPORT_COLORS.text.secondary,
                margin: 0,
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              {metrics.averageGrade < 6
                ? "🎯 Recomendação: Reforço escolar prioritário e reunião com pais."
                : metrics.averageGrade < 7
                  ? "📚 Recomendação: Apoio contínuo nas matérias base."
                  : metrics.averageGrade < 9
                    ? "🚀 Recomendação: Incentivar a monitoria e aprofundamento."
                    : "🏆 Recomendação: Participação em olimpíadas e projetos avançados."}
            </p>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};
