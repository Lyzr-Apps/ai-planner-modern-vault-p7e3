'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { getSchedule, getScheduleLogs, pauseSchedule, resumeSchedule, triggerScheduleNow, cronToHuman, listSchedules } from '@/lib/scheduler'
import type { Schedule, ExecutionLog } from '@/lib/scheduler'
import parseLLMJson from '@/lib/jsonParser'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { HiOutlineAcademicCap, HiOutlineCalendar, HiOutlineBell, HiOutlineClock, HiOutlineBookOpen, HiOutlineChartBar, HiOutlineCog6Tooth, HiOutlineCheck, HiOutlineExclamationTriangle, HiOutlinePlus, HiOutlineTrash, HiOutlineArrowPath, HiOutlineChevronRight, HiOutlineUser, HiOutlineInformationCircle } from 'react-icons/hi2'
import { FiGitBranch, FiPlay, FiPause, FiTarget, FiZap, FiLayers, FiExternalLink } from 'react-icons/fi'
import { Loader2 } from 'lucide-react'

// ============================================================================
// Constants
// ============================================================================

const STUDY_PLAN_AGENT_ID = '6999619fc066ed107671ac69'
const GITHUB_MONITOR_AGENT_ID = '699961ca72a2e3b0eaab977e'
const DEADLINE_REMINDER_AGENT_ID = '699961a0730bbd74d53e8a0b'
const RESOURCE_RECOMMENDER_AGENT_ID = '699961a0a63b170a3b8170f5'
const SCHEDULE_ID = '699961b7399dfadeac37e2b2'

const AGENTS = [
  { id: STUDY_PLAN_AGENT_ID, name: 'Study Plan Agent', purpose: 'Generates personalized weekly study plans with time-blocking' },
  { id: GITHUB_MONITOR_AGENT_ID, name: 'GitHub Monitor Agent', purpose: 'Fetches project milestones and open issues from GitHub' },
  { id: DEADLINE_REMINDER_AGENT_ID, name: 'Deadline Reminder Agent', purpose: 'Daily prioritized reminders with preparation actions' },
  { id: RESOURCE_RECOMMENDER_AGENT_ID, name: 'Resource Recommender Agent', purpose: 'Recommends learning resources based on subjects and gaps' },
]

// ============================================================================
// Interfaces
// ============================================================================

interface TimeBlock {
  start_time: string
  end_time: string
  subject: string
  activity_type: string
  priority: string
  description: string
}

interface DayPlan {
  day: string
  time_blocks: TimeBlock[]
}

interface ConflictResolution {
  conflict: string
  resolution: string
  reasoning: string
}

interface StudyPlanData {
  weekly_plan: DayPlan[]
  conflict_resolutions: ConflictResolution[]
  summary: string
  total_study_hours: number
  total_project_hours: number
}

interface Milestone {
  title: string
  description: string
  due_date: string
  progress_percentage: number
  open_issues: number
  closed_issues: number
}

interface OpenIssue {
  title: string
  labels: string
  created_at: string
  priority: string
}

interface UpcomingDeadline {
  item: string
  due_date: string
  type: string
}

interface GitHubData {
  repository_name: string
  milestones: Milestone[]
  open_issues: OpenIssue[]
  summary: string
  total_open_issues: number
  upcoming_deadlines: UpcomingDeadline[]
}

interface Reminder {
  item: string
  category: string
  due_date: string
  days_remaining: number
  priority: string
  preparation_actions: string[]
}

interface DeadlineData {
  daily_briefing: string
  reminders: Reminder[]
  urgent_count: number
  total_deadlines: number
  date: string
}

interface Resource {
  subject: string
  title: string
  platform: string
  duration: string
  relevance_score: number
  description: string
  url: string
}

interface ResourceData {
  recommendations: Resource[]
  summary: string
  total_resources: number
}

interface CourseEntry {
  name: string
  examDate: string
  difficulty: number
  performance: string
}

// ============================================================================
// Sample Data
// ============================================================================

const SAMPLE_STUDY_PLAN: StudyPlanData = {
  weekly_plan: [
    {
      day: 'Monday',
      time_blocks: [
        { start_time: '09:00', end_time: '10:30', subject: 'Linear Algebra', activity_type: 'Study', priority: 'high', description: 'Review matrix operations and eigenvalues for upcoming exam' },
        { start_time: '11:00', end_time: '12:30', subject: 'Data Structures', activity_type: 'Project', priority: 'medium', description: 'Implement binary search tree for CS project' },
        { start_time: '14:00', end_time: '15:00', subject: 'Physics', activity_type: 'Review', priority: 'low', description: 'Review lecture notes on thermodynamics' },
      ],
    },
    {
      day: 'Tuesday',
      time_blocks: [
        { start_time: '09:00', end_time: '11:00', subject: 'Machine Learning', activity_type: 'Study', priority: 'high', description: 'Study neural network architectures and backpropagation' },
        { start_time: '13:00', end_time: '14:30', subject: 'Linear Algebra', activity_type: 'Review', priority: 'medium', description: 'Practice problem sets for determinants' },
      ],
    },
    {
      day: 'Wednesday',
      time_blocks: [
        { start_time: '10:00', end_time: '12:00', subject: 'Data Structures', activity_type: 'Project', priority: 'high', description: 'Complete graph traversal algorithms implementation' },
        { start_time: '14:00', end_time: '15:30', subject: 'Physics', activity_type: 'Study', priority: 'medium', description: 'Solve practice problems on wave mechanics' },
      ],
    },
    {
      day: 'Thursday',
      time_blocks: [
        { start_time: '09:00', end_time: '10:30', subject: 'Machine Learning', activity_type: 'Project', priority: 'high', description: 'Train CNN model on CIFAR-10 dataset' },
        { start_time: '11:00', end_time: '12:00', subject: 'Linear Algebra', activity_type: 'Study', priority: 'medium', description: 'Study vector spaces and linear transformations' },
        { start_time: '14:00', end_time: '15:00', subject: 'Physics', activity_type: 'Review', priority: 'low', description: 'Review thermodynamics homework solutions' },
      ],
    },
    {
      day: 'Friday',
      time_blocks: [
        { start_time: '09:00', end_time: '11:00', subject: 'Data Structures', activity_type: 'Study', priority: 'high', description: 'Study dynamic programming concepts' },
        { start_time: '13:00', end_time: '14:00', subject: 'Machine Learning', activity_type: 'Review', priority: 'medium', description: 'Review week progress and plan next steps' },
      ],
    },
  ],
  conflict_resolutions: [
    { conflict: 'Linear Algebra exam and ML project deadline overlap on Thursday', resolution: 'Prioritized Linear Algebra study early in the week, shifted ML project work to Wednesday', reasoning: 'Linear Algebra exam carries more weight (30% of grade) and requires more focused preparation time' },
    { conflict: 'Physics review and Data Structures project compete for afternoon slots', resolution: 'Alternated Physics and DS across days, giving DS priority on project-heavy days', reasoning: 'DS project has a hard submission deadline while Physics review is ongoing preparation' },
  ],
  summary: 'This week focuses on Linear Algebra exam preparation and Data Structures project completion. Machine Learning has dedicated deep-work sessions on Tuesday and Thursday. Physics review is distributed across lighter afternoon slots.',
  total_study_hours: 18,
  total_project_hours: 8,
}

const SAMPLE_GITHUB: GitHubData = {
  repository_name: 'ml-final-project',
  milestones: [
    { title: 'Data Pipeline Complete', description: 'Set up ETL pipeline for training data', due_date: '2026-02-28', progress_percentage: 75, open_issues: 3, closed_issues: 9 },
    { title: 'Model Training v1', description: 'First iteration of model training with baseline metrics', due_date: '2026-03-10', progress_percentage: 40, open_issues: 5, closed_issues: 4 },
    { title: 'Final Presentation', description: 'Prepare slides and demo for final presentation', due_date: '2026-03-25', progress_percentage: 10, open_issues: 8, closed_issues: 1 },
  ],
  open_issues: [
    { title: 'Fix data preprocessing pipeline memory leak', labels: 'bug, priority-high', created_at: '2026-02-15', priority: 'high' },
    { title: 'Add unit tests for feature extraction', labels: 'testing', created_at: '2026-02-18', priority: 'medium' },
    { title: 'Document API endpoints', labels: 'documentation', created_at: '2026-02-19', priority: 'low' },
    { title: 'Optimize batch processing speed', labels: 'performance', created_at: '2026-02-20', priority: 'medium' },
  ],
  summary: 'The ml-final-project has 3 active milestones with 16 total open issues. The Data Pipeline milestone is nearing completion at 75%. Immediate attention needed on the memory leak bug.',
  total_open_issues: 16,
  upcoming_deadlines: [
    { item: 'Data Pipeline Complete', due_date: '2026-02-28', type: 'milestone' },
    { item: 'Model Training v1', due_date: '2026-03-10', type: 'milestone' },
    { item: 'Final Presentation', due_date: '2026-03-25', type: 'milestone' },
  ],
}

const SAMPLE_DEADLINES: DeadlineData = {
  daily_briefing: 'Good morning! You have 5 upcoming deadlines this week. Two are urgent: Linear Algebra exam tomorrow and Data Structures project due in 3 days. Focus on exam prep today and allocate evening time for project review.',
  reminders: [
    { item: 'Linear Algebra Midterm Exam', category: 'Academic', due_date: '2026-02-22', days_remaining: 1, priority: 'high', preparation_actions: ['Review eigenvalue/eigenvector problems', 'Complete practice exam #3', 'Review class notes from weeks 4-7'] },
    { item: 'Data Structures Project Submission', category: 'Academic', due_date: '2026-02-24', days_remaining: 3, priority: 'high', preparation_actions: ['Finish graph traversal implementation', 'Write unit tests', 'Update README documentation'] },
    { item: 'ML Project - Data Pipeline Milestone', category: 'Project', due_date: '2026-02-28', days_remaining: 7, priority: 'medium', preparation_actions: ['Fix memory leak issue', 'Complete remaining 3 issues', 'Run integration tests'] },
    { item: 'Physics Lab Report', category: 'Academic', due_date: '2026-03-01', days_remaining: 8, priority: 'low', preparation_actions: ['Analyze experiment data', 'Write results section', 'Add error analysis'] },
    { item: 'ML Model Training v1 Deadline', category: 'Project', due_date: '2026-03-10', days_remaining: 17, priority: 'medium', preparation_actions: ['Set up training infrastructure', 'Define baseline metrics', 'Begin hyperparameter tuning'] },
  ],
  urgent_count: 2,
  total_deadlines: 5,
  date: '2026-02-21',
}

const SAMPLE_RESOURCES: ResourceData = {
  recommendations: [
    { subject: 'Linear Algebra', title: 'Essence of Linear Algebra', platform: 'YouTube', duration: '3h 30m', relevance_score: 95, description: '3Blue1Brown visual series covering vectors, matrices, eigenvalues with beautiful geometric intuitions', url: 'https://youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab' },
    { subject: 'Machine Learning', title: 'Deep Learning Specialization', platform: 'Coursera', duration: '4 months', relevance_score: 90, description: 'Andrew Ng comprehensive deep learning course covering CNNs, RNNs, and practical projects', url: 'https://www.coursera.org/specializations/deep-learning' },
    { subject: 'Data Structures', title: 'Graph Theory Algorithms', platform: 'Udemy', duration: '8h', relevance_score: 85, description: 'Complete guide to graph algorithms including BFS, DFS, shortest paths, and minimum spanning trees', url: 'https://www.udemy.com/course/graph-theory-algorithms/' },
    { subject: 'Physics', title: 'MIT 8.01 Classical Mechanics', platform: 'YouTube', duration: '24h', relevance_score: 78, description: 'Walter Lewin legendary physics lectures covering mechanics and thermodynamics', url: 'https://youtube.com/playlist?list=PLyQSN7X0ro203puVhQsmCj9qIjq3' },
    { subject: 'Machine Learning', title: 'PyTorch for Deep Learning', platform: 'Udemy', duration: '12h', relevance_score: 82, description: 'Hands-on PyTorch course with CNN, GAN, and transformer implementations', url: 'https://www.udemy.com/course/pytorch-deep-learning/' },
  ],
  summary: 'Found 5 highly relevant resources across your 4 subjects. Top recommendation: 3Blue1Brown Linear Algebra series (95% relevance) for your upcoming midterm exam preparation.',
  total_resources: 5,
}

// ============================================================================
// Helpers
// ============================================================================

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part)
}

function getPriorityColor(priority: string): string {
  const p = (priority ?? '').toLowerCase()
  if (p === 'high') return 'bg-red-500/20 text-red-400 border-red-500/30'
  if (p === 'medium') return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
}

function getActivityColor(type: string): string {
  const t = (type ?? '').toLowerCase()
  if (t === 'study') return 'bg-emerald-500/20 border-l-emerald-500'
  if (t === 'project') return 'bg-blue-500/20 border-l-blue-500'
  if (t === 'review') return 'bg-amber-500/20 border-l-amber-500'
  return 'bg-muted border-l-muted-foreground'
}

function getPlatformColor(platform: string): string {
  const p = (platform ?? '').toLowerCase()
  if (p === 'youtube') return 'bg-red-500/20 text-red-400'
  if (p === 'coursera') return 'bg-blue-500/20 text-blue-400'
  if (p === 'udemy') return 'bg-purple-500/20 text-purple-400'
  return 'bg-muted text-muted-foreground'
}

function extractAgentData(result: any): any {
  const data = result?.response?.result
  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    return data
  }
  if (result?.raw_response) {
    const parsed = parseLLMJson(result.raw_response)
    if (parsed && typeof parsed === 'object' && !parsed.error) {
      return parsed
    }
  }
  return null
}

// ============================================================================
// ErrorBoundary
// ============================================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">Try again</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

function SkeletonCard() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="bg-card border-border shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="p-2.5 rounded-lg bg-secondary text-emerald-400">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function InlineMessage({ type, message }: { type: 'success' | 'error' | 'info'; message: string }) {
  const colors = type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
  return (
    <div className={`p-3 rounded-lg border text-sm ${colors}`}>
      <div className="flex items-center gap-2">
        {type === 'success' && <HiOutlineCheck className="w-4 h-4 flex-shrink-0" />}
        {type === 'error' && <HiOutlineExclamationTriangle className="w-4 h-4 flex-shrink-0" />}
        {type === 'info' && <HiOutlineInformationCircle className="w-4 h-4 flex-shrink-0" />}
        <span>{message}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Dashboard Screen
// ============================================================================

function DashboardScreen({ studyPlan, deadlines, githubData, onNavigate, activeAgentId, onGeneratePlan, onSyncGithub }: {
  studyPlan: StudyPlanData | null
  deadlines: DeadlineData | null
  githubData: GitHubData | null
  onNavigate: (screen: string) => void
  activeAgentId: string | null
  onGeneratePlan: () => void
  onSyncGithub: () => void
}) {
  const totalBlocks = studyPlan ? (Array.isArray(studyPlan?.weekly_plan) ? studyPlan.weekly_plan : []).reduce((sum, d) => sum + (Array.isArray(d?.time_blocks) ? d.time_blocks.length : 0), 0) : 0
  const completedMilestones = githubData ? (Array.isArray(githubData?.milestones) ? githubData.milestones : []).filter(m => (m?.progress_percentage ?? 0) >= 100).length : 0
  const totalMilestones = (Array.isArray(githubData?.milestones) ? githubData.milestones : []).length
  const urgentCount = deadlines?.urgent_count ?? 0
  const totalHours = (studyPlan?.total_study_hours ?? 0) + (studyPlan?.total_project_hours ?? 0)

  const reminders = Array.isArray(deadlines?.reminders) ? deadlines.reminders : []
  const weeklyPlan = Array.isArray(studyPlan?.weekly_plan) ? studyPlan.weekly_plan : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your academic overview at a glance</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onGeneratePlan} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <FiZap className="w-4 h-4 mr-1.5" />Generate New Plan
          </Button>
          <Button size="sm" variant="outline" onClick={onSyncGithub}>
            <FiGitBranch className="w-4 h-4 mr-1.5" />Sync GitHub
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<HiOutlineChartBar className="w-5 h-5" />} label="Study Hours" value={totalHours || '--'} sub={studyPlan ? `${studyPlan.total_study_hours ?? 0}h study + ${studyPlan.total_project_hours ?? 0}h project` : 'Generate a plan to see'} />
        <StatCard icon={<FiTarget className="w-5 h-5" />} label="Milestones" value={githubData ? `${completedMilestones}/${totalMilestones}` : '--'} sub={githubData ? `${githubData?.total_open_issues ?? 0} open issues` : 'Sync GitHub to see'} />
        <StatCard icon={<HiOutlineBell className="w-5 h-5" />} label="Upcoming Deadlines" value={deadlines?.total_deadlines ?? '--'} sub={urgentCount > 0 ? `${urgentCount} urgent` : 'No urgent deadlines'} />
        <StatCard icon={<HiOutlineClock className="w-5 h-5" />} label="Time Blocks" value={totalBlocks || '--'} sub={studyPlan ? `${weeklyPlan.length} days planned` : 'Generate a plan'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <HiOutlineCalendar className="w-4 h-4 text-emerald-400" />This Week&apos;s Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyPlan.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HiOutlineCalendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No study plan generated yet.</p>
                <Button size="sm" variant="link" className="text-emerald-400 mt-1" onClick={onGeneratePlan}>Generate your first plan</Button>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-3">
                  {weeklyPlan.slice(0, 5).map((day, i) => (
                    <div key={i}>
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">{day?.day ?? 'Day'}</p>
                      <div className="space-y-1">
                        {(Array.isArray(day?.time_blocks) ? day.time_blocks : []).slice(0, 3).map((block, j) => (
                          <div key={j} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border-l-2 ${getActivityColor(block?.activity_type ?? '')}`}>
                            <span className="text-[11px] text-muted-foreground font-mono w-[90px] flex-shrink-0">{block?.start_time ?? ''} - {block?.end_time ?? ''}</span>
                            <span className="text-xs font-medium truncate flex-1">{block?.subject ?? ''}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getPriorityColor(block?.priority ?? '')}`}>{block?.priority ?? ''}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <HiOutlineBell className="w-4 h-4 text-amber-400" />Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HiOutlineBell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No reminders yet.</p>
                <p className="text-xs mt-1">Reminders run daily at 8:00 AM EST</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <div className="space-y-2">
                  {reminders.map((r, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r?.item ?? 'Untitled'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{r?.category ?? ''}</Badge>
                            <span className="text-[11px] text-muted-foreground">{r?.due_date ?? ''}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${getPriorityColor(r?.priority ?? '')}`}>
                          {(r?.days_remaining ?? 0) <= 1 ? 'URGENT' : `${r?.days_remaining ?? 0}d left`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================================
// Plan Screen
// ============================================================================

function PlanScreen({ studyPlan, setStudyPlan, activeAgentId, setActiveAgentId }: {
  studyPlan: StudyPlanData | null
  setStudyPlan: (d: StudyPlanData) => void
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [courses, setCourses] = useState<CourseEntry[]>([{ name: '', examDate: '', difficulty: 3, performance: '' }])
  const [projectCommitments, setProjectCommitments] = useState('')
  const [availableHours, setAvailableHours] = useState('6')

  const addCourse = () => setCourses(prev => [...prev, { name: '', examDate: '', difficulty: 3, performance: '' }])
  const removeCourse = (idx: number) => setCourses(prev => prev.filter((_, i) => i !== idx))
  const updateCourse = (idx: number, field: keyof CourseEntry, value: string | number) => {
    setCourses(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  const handleGenerate = async () => {
    const validCourses = courses.filter(c => c.name.trim())
    if (validCourses.length === 0) {
      setError('Please add at least one course name.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    setActiveAgentId(STUDY_PLAN_AGENT_ID)
    const courseDetails = validCourses.map(c => `${c.name} (exam: ${c.examDate || 'not set'}, difficulty: ${c.difficulty}/5, performance: ${c.performance || 'average'})`).join('; ')
    const message = `Generate a weekly study plan for these courses: ${courseDetails}. Project commitments: ${projectCommitments || 'none'}. Available hours per day: ${availableHours || '6'}. Include time-blocked schedule, conflict resolutions, and summary.`
    try {
      const result = await callAIAgent(message, STUDY_PLAN_AGENT_ID)
      if (result.success) {
        const data = extractAgentData(result)
        if (data) {
          setStudyPlan(data as StudyPlanData)
          setSuccess('Study plan generated successfully!')
          setTimeout(() => setSuccess(null), 4000)
        } else {
          setError('Could not parse study plan response.')
        }
      } else {
        setError(result.error || 'Failed to generate study plan.')
      }
    } catch (e) {
      setError('Network error occurred. Please try again.')
    }
    setActiveAgentId(null)
    setLoading(false)
  }

  const weeklyPlan = Array.isArray(studyPlan?.weekly_plan) ? studyPlan.weekly_plan : []
  const conflicts = Array.isArray(studyPlan?.conflict_resolutions) ? studyPlan.conflict_resolutions : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Study Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate personalized time-blocked study schedules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-card border-border shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Course Details</CardTitle>
              <CardDescription className="text-xs">Add your courses, exam dates, and difficulty levels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="max-h-[320px] pr-1">
                <div className="space-y-3">
                  {courses.map((course, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Course name" value={course.name} onChange={(e) => updateCourse(i, 'name', e.target.value)} className="bg-background text-sm" />
                        {courses.length > 1 && (
                          <Button size="icon" variant="ghost" onClick={() => removeCourse(i)} className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-red-400">
                            <HiOutlineTrash className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Exam Date</Label>
                          <Input type="date" value={course.examDate} onChange={(e) => updateCourse(i, 'examDate', e.target.value)} className="bg-background text-sm h-8" />
                        </div>
                        <div>
                          <Label className="text-[11px] text-muted-foreground">Performance</Label>
                          <Input placeholder="e.g. B+" value={course.performance} onChange={(e) => updateCourse(i, 'performance', e.target.value)} className="bg-background text-sm h-8" />
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Difficulty: {course.difficulty}/5</Label>
                        <input type="range" min={1} max={5} value={course.difficulty} onChange={(e) => updateCourse(i, 'difficulty', parseInt(e.target.value))} className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-500 bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button size="sm" variant="outline" onClick={addCourse} className="w-full">
                <HiOutlinePlus className="w-4 h-4 mr-1" />Add Course
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-md">
            <CardContent className="p-5 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Project Commitments</Label>
                <Textarea placeholder="Describe your current project work..." value={projectCommitments} onChange={(e) => setProjectCommitments(e.target.value)} rows={3} className="bg-background text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Available Hours/Day</Label>
                <Input type="number" min={1} max={16} value={availableHours} onChange={(e) => setAvailableHours(e.target.value)} className="bg-background text-sm mt-1 w-24" />
              </div>
              <Button onClick={handleGenerate} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><FiZap className="w-4 h-4 mr-2" />Generate Study Plan</>}
              </Button>
              {error && <InlineMessage type="error" message={error} />}
              {success && <InlineMessage type="success" message={success} />}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : !studyPlan ? (
            <Card className="bg-card border-border shadow-md">
              <CardContent className="p-12 text-center">
                <HiOutlineCalendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-1">No Study Plan Yet</h3>
                <p className="text-sm text-muted-foreground">Fill in your course details and click Generate Study Plan to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {studyPlan?.summary && (
                <Card className="bg-card border-border shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <FiLayers className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-sm font-semibold">Plan Summary</h3>
                    </div>
                    <div className="text-sm text-muted-foreground">{renderMarkdown(studyPlan.summary)}</div>
                    <div className="flex gap-3 mt-3">
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">{studyPlan?.total_study_hours ?? 0}h Study</Badge>
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">{studyPlan?.total_project_hours ?? 0}h Project</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-card border-border shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Weekly Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-2">
                    <div className="space-y-4">
                      {weeklyPlan.map((day, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-400">{day?.day ?? 'Day'}</h4>
                          </div>
                          <div className="space-y-1.5 ml-4">
                            {(Array.isArray(day?.time_blocks) ? day.time_blocks : []).map((block, j) => (
                              <div key={j} className={`p-3 rounded-lg border-l-3 border ${getActivityColor(block?.activity_type ?? '')} transition-all duration-200 hover:shadow-md`}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-muted-foreground">{block?.start_time ?? ''} - {block?.end_time ?? ''}</span>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{block?.activity_type ?? ''}</Badge>
                                  </div>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getPriorityColor(block?.priority ?? '')}`}>{block?.priority ?? ''}</Badge>
                                </div>
                                <p className="text-sm font-semibold">{block?.subject ?? ''}</p>
                                {block?.description && <p className="text-xs text-muted-foreground mt-0.5">{block.description}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {conflicts.length > 0 && (
                <Card className="bg-card border-border shadow-md border-l-4 border-l-amber-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <HiOutlineExclamationTriangle className="w-4 h-4 text-amber-400" />Conflict Resolutions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {conflicts.map((c, i) => (
                      <div key={i} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <p className="text-sm font-medium text-amber-400">{c?.conflict ?? ''}</p>
                        <p className="text-sm mt-1">{c?.resolution ?? ''}</p>
                        {c?.reasoning && <p className="text-xs text-muted-foreground mt-1 italic">{c.reasoning}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Milestones Screen
// ============================================================================

function MilestonesScreen({ githubData, setGithubData, deadlines, activeAgentId, setActiveAgentId }: {
  githubData: GitHubData | null
  setGithubData: (d: GitHubData) => void
  deadlines: DeadlineData | null
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}) {
  const [repoName, setRepoName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSync = async () => {
    if (!repoName.trim()) {
      setError('Please enter a repository name.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    setActiveAgentId(GITHUB_MONITOR_AGENT_ID)
    try {
      const result = await callAIAgent(`Fetch milestones, issues, and deadlines from GitHub repository: ${repoName}`, GITHUB_MONITOR_AGENT_ID)
      if (result.success) {
        const data = extractAgentData(result)
        if (data) {
          setGithubData(data as GitHubData)
          setSuccess('GitHub data synced successfully!')
          setTimeout(() => setSuccess(null), 4000)
        } else {
          setError('Could not parse GitHub response.')
        }
      } else {
        setError(result.error || 'Failed to sync GitHub data.')
      }
    } catch (e) {
      setError('Network error. Please try again.')
    }
    setActiveAgentId(null)
    setLoading(false)
  }

  const milestones = Array.isArray(githubData?.milestones) ? githubData.milestones : []
  const openIssues = Array.isArray(githubData?.open_issues) ? githubData.open_issues : []
  const upcomingDeadlines = Array.isArray(githubData?.upcoming_deadlines) ? githubData.upcoming_deadlines : []
  const academicDeadlines = Array.isArray(deadlines?.reminders) ? deadlines.reminders : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Milestones</h1>
        <p className="text-sm text-muted-foreground mt-1">Track GitHub project milestones alongside academic deadlines</p>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardContent className="p-5">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Repository Name</Label>
              <Input placeholder="e.g. owner/repo-name" value={repoName} onChange={(e) => setRepoName(e.target.value)} className="bg-background text-sm mt-1" />
            </div>
            <Button onClick={handleSync} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</> : <><FiGitBranch className="w-4 h-4 mr-2" />Sync GitHub</>}
            </Button>
          </div>
          {error && <div className="mt-3"><InlineMessage type="error" message={error} /></div>}
          {success && <div className="mt-3"><InlineMessage type="success" message={success} /></div>}
        </CardContent>
      </Card>

      {(milestones.length > 0 || upcomingDeadlines.length > 0 || academicDeadlines.length > 0) && (
        <Card className="bg-card border-border shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Timeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {upcomingDeadlines.map((d, i) => (
                <div key={`g-${i}`} className="flex-shrink-0 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-[10px] text-blue-400 font-medium uppercase">{d?.type ?? 'Project'}</p>
                  <p className="text-xs font-semibold truncate max-w-[140px]">{d?.item ?? ''}</p>
                  <p className="text-[10px] text-muted-foreground">{d?.due_date ?? ''}</p>
                </div>
              ))}
              {academicDeadlines.filter(r => (r?.category ?? '').toLowerCase() === 'academic').slice(0, 3).map((r, i) => (
                <div key={`a-${i}`} className="flex-shrink-0 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-400 font-medium uppercase">Academic</p>
                  <p className="text-xs font-semibold truncate max-w-[140px]">{r?.item ?? ''}</p>
                  <p className="text-[10px] text-muted-foreground">{r?.due_date ?? ''}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
          <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
        </div>
      ) : !githubData && academicDeadlines.length === 0 ? (
        <Card className="bg-card border-border shadow-md">
          <CardContent className="p-12 text-center">
            <FiGitBranch className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No Milestones Yet</h3>
            <p className="text-sm text-muted-foreground">Connect your GitHub repository to track project milestones.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-400">
              <FiGitBranch className="w-4 h-4" />GitHub Milestones
              {githubData?.repository_name && <Badge variant="outline" className="text-[10px]">{githubData.repository_name}</Badge>}
            </h3>
            {githubData?.summary && (
              <Card className="bg-card border-border shadow-md">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">{renderMarkdown(githubData.summary)}</div>
                  <p className="text-xs text-muted-foreground mt-2">Total open issues: {githubData?.total_open_issues ?? 0}</p>
                </CardContent>
              </Card>
            )}
            {milestones.map((m, i) => (
              <Card key={i} className="bg-card border-border shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-semibold">{m?.title ?? 'Untitled'}</h4>
                    <span className="text-xs text-muted-foreground">{m?.due_date ?? ''}</span>
                  </div>
                  {m?.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  <Progress value={m?.progress_percentage ?? 0} className="h-1.5" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{m?.progress_percentage ?? 0}% complete</span>
                    <span>{m?.open_issues ?? 0} open / {m?.closed_issues ?? 0} closed</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {openIssues.length > 0 && (
              <Card className="bg-card border-border shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Open Issues</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {openIssues.map((issue, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{issue?.title ?? ''}</p>
                        <p className="text-[10px] text-muted-foreground">{issue?.labels ?? ''} | {issue?.created_at ?? ''}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex-shrink-0 ml-2 ${getPriorityColor(issue?.priority ?? '')}`}>{issue?.priority ?? ''}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-400">
              <HiOutlineAcademicCap className="w-4 h-4" />Academic Deadlines
            </h3>
            {academicDeadlines.length === 0 ? (
              <Card className="bg-card border-border shadow-md">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No academic deadlines loaded yet.</p>
                  <p className="text-xs mt-1">Reminders will appear from the Deadline Agent.</p>
                </CardContent>
              </Card>
            ) : (
              academicDeadlines.map((r, i) => (
                <Card key={i} className="bg-card border-border shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-semibold">{r?.item ?? 'Untitled'}</h4>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getPriorityColor(r?.priority ?? '')}`}>{r?.priority ?? ''}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{r?.category ?? ''}</span>
                      <span>{r?.due_date ?? ''}</span>
                      <span className="font-medium">{r?.days_remaining ?? 0} days left</span>
                    </div>
                    {Array.isArray(r?.preparation_actions) && r.preparation_actions.length > 0 && (
                      <div className="mt-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Prep Actions</p>
                        <ul className="space-y-0.5">
                          {r.preparation_actions.map((a, j) => (
                            <li key={j} className="text-xs flex items-start gap-1.5">
                              <HiOutlineChevronRight className="w-3 h-3 mt-0.5 text-emerald-400 flex-shrink-0" />
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Resources Screen
// ============================================================================

function ResourcesScreen({ resources, setResources, activeAgentId, setActiveAgentId }: {
  resources: ResourceData | null
  setResources: (d: ResourceData) => void
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
}) {
  const [subjects, setSubjects] = useState('')
  const [gaps, setGaps] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterSubject, setFilterSubject] = useState<string | null>(null)

  const handleGetResources = async () => {
    if (!subjects.trim()) {
      setError('Please enter at least one subject.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    setActiveAgentId(RESOURCE_RECOMMENDER_AGENT_ID)
    try {
      const message = `Recommend learning resources for these subjects: ${subjects}. Knowledge gaps: ${gaps || 'general review'}. Include video courses and tutorials from YouTube, Udemy, and Coursera.`
      const result = await callAIAgent(message, RESOURCE_RECOMMENDER_AGENT_ID)
      if (result.success) {
        const data = extractAgentData(result)
        if (data) {
          setResources(data as ResourceData)
          setSuccess('Resources found!')
          setTimeout(() => setSuccess(null), 4000)
        } else {
          setError('Could not parse resource recommendations.')
        }
      } else {
        setError(result.error || 'Failed to get resources.')
      }
    } catch (e) {
      setError('Network error. Please try again.')
    }
    setActiveAgentId(null)
    setLoading(false)
  }

  const recs = Array.isArray(resources?.recommendations) ? resources.recommendations : []
  const allSubjects = [...new Set(recs.map(r => r?.subject ?? '').filter(Boolean))]
  const filteredRecs = filterSubject ? recs.filter(r => r?.subject === filterSubject) : recs

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
        <p className="text-sm text-muted-foreground mt-1">AI-recommended learning resources for your subjects</p>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardContent className="p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Subjects</Label>
              <Input placeholder="e.g. Linear Algebra, Machine Learning, Physics" value={subjects} onChange={(e) => setSubjects(e.target.value)} className="bg-background text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Knowledge Gaps (optional)</Label>
              <Input placeholder="e.g. eigenvalues, backpropagation" value={gaps} onChange={(e) => setGaps(e.target.value)} className="bg-background text-sm mt-1" />
            </div>
          </div>
          <Button onClick={handleGetResources} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Searching...</> : <><HiOutlineBookOpen className="w-4 h-4 mr-2" />Get Recommendations</>}
          </Button>
          {error && <InlineMessage type="error" message={error} />}
          {success && <InlineMessage type="success" message={success} />}
        </CardContent>
      </Card>

      {allSubjects.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Badge variant={filterSubject === null ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setFilterSubject(null)}>All ({recs.length})</Badge>
          {allSubjects.map((s) => (
            <Badge key={s} variant={filterSubject === s ? 'default' : 'outline'} className="cursor-pointer text-xs" onClick={() => setFilterSubject(filterSubject === s ? null : s)}>
              {s} ({recs.filter(r => r?.subject === s).length})
            </Badge>
          ))}
        </div>
      )}

      {resources?.summary && (
        <Card className="bg-card border-border shadow-md">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">{renderMarkdown(resources.summary)}</div>
            <p className="text-xs text-muted-foreground mt-2">Total resources: {resources?.total_resources ?? 0}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filteredRecs.length === 0 && !resources ? (
        <Card className="bg-card border-border shadow-md">
          <CardContent className="p-12 text-center">
            <HiOutlineBookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-1">No Resources Yet</h3>
            <p className="text-sm text-muted-foreground">Enter your subjects and click Get Recommendations to discover learning materials.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecs.map((rec, i) => (
            <Card key={i} className="bg-card border-border shadow-md hover:shadow-lg transition-all duration-300">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold leading-tight">{rec?.title ?? 'Untitled'}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getPlatformColor(rec?.platform ?? '')}`}>{rec?.platform ?? ''}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{rec?.subject ?? ''}</Badge>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-emerald-400">{rec?.relevance_score ?? 0}%</p>
                    <p className="text-[10px] text-muted-foreground">relevance</p>
                  </div>
                </div>
                {rec?.description && <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <HiOutlineClock className="w-3 h-3" />{rec?.duration ?? ''}
                  </span>
                  {rec?.url && (
                    <a href={rec.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                      Open <FiExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div className="bg-emerald-500 h-1 rounded-full transition-all" style={{ width: `${Math.min(rec?.relevance_score ?? 0, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Settings Screen
// ============================================================================

function SettingsScreen({ activeAgentId, setActiveAgentId, setDeadlines }: {
  activeAgentId: string | null
  setActiveAgentId: (id: string | null) => void
  setDeadlines: (d: DeadlineData) => void
}) {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [schedLoading, setSchedLoading] = useState(false)
  const [schedError, setSchedError] = useState<string | null>(null)
  const [schedSuccess, setSchedSuccess] = useState<string | null>(null)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)

  const [profileCourses, setProfileCourses] = useState<string[]>([''])
  const [repoUrl, setRepoUrl] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  const loadScheduleData = useCallback(async () => {
    setSchedLoading(true)
    setSchedError(null)
    try {
      const schedResult = await getSchedule(SCHEDULE_ID)
      if (schedResult.success && schedResult.schedule) {
        setSchedule(schedResult.schedule)
      }
      const logsResult = await getScheduleLogs(SCHEDULE_ID, { limit: 5 })
      if (logsResult.success) {
        setLogs(Array.isArray(logsResult.executions) ? logsResult.executions : [])
      }
    } catch (e) {
      setSchedError('Failed to load schedule data.')
    }
    setSchedLoading(false)
  }, [])

  useEffect(() => {
    loadScheduleData()
  }, [loadScheduleData])

  const handleToggleSchedule = async () => {
    if (!schedule) return
    setToggleLoading(true)
    setSchedError(null)
    setSchedSuccess(null)
    try {
      if (schedule.is_active) {
        await pauseSchedule(SCHEDULE_ID)
      } else {
        await resumeSchedule(SCHEDULE_ID)
      }
      const refreshed = await listSchedules()
      if (refreshed.success) {
        const found = refreshed.schedules.find(s => s.id === SCHEDULE_ID)
        if (found) setSchedule(found)
      }
      setSchedSuccess(schedule.is_active ? 'Schedule paused.' : 'Schedule resumed.')
      setTimeout(() => setSchedSuccess(null), 3000)
    } catch (e) {
      setSchedError('Failed to toggle schedule.')
    }
    setToggleLoading(false)
  }

  const handleTriggerNow = async () => {
    setTriggerLoading(true)
    setSchedError(null)
    setSchedSuccess(null)
    setActiveAgentId(DEADLINE_REMINDER_AGENT_ID)
    try {
      await triggerScheduleNow(SCHEDULE_ID)
      setSchedSuccess('Trigger sent! The reminder agent will run shortly.')
      setTimeout(() => setSchedSuccess(null), 4000)
      setTimeout(async () => {
        const logsResult = await getScheduleLogs(SCHEDULE_ID, { limit: 5 })
        if (logsResult.success) {
          setLogs(Array.isArray(logsResult.executions) ? logsResult.executions : [])
        }
      }, 5000)
    } catch (e) {
      setSchedError('Failed to trigger schedule.')
    }
    setActiveAgentId(null)
    setTriggerLoading(false)
  }

  const addProfileCourse = () => setProfileCourses(prev => [...prev, ''])
  const removeProfileCourse = (idx: number) => setProfileCourses(prev => prev.filter((_, i) => i !== idx))
  const updateProfileCourse = (idx: number, value: string) => {
    setProfileCourses(prev => prev.map((c, i) => i === idx ? value : c))
  }

  const handleSaveProfile = () => {
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your profile, connections, and reminders</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-secondary">
          <TabsTrigger value="profile">Academic Profile</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
          <TabsTrigger value="schedule">Reminder Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Academic Profile</CardTitle>
              <CardDescription className="text-xs">Set up your courses and study preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Courses</Label>
                <div className="space-y-2 mt-1">
                  {profileCourses.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input placeholder={`Course ${i + 1}`} value={c} onChange={(e) => updateProfileCourse(i, e.target.value)} className="bg-background text-sm" />
                      {profileCourses.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeProfileCourse(i)} className="h-8 w-8 text-muted-foreground hover:text-red-400">
                          <HiOutlineTrash className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={addProfileCourse}>
                    <HiOutlinePlus className="w-4 h-4 mr-1" />Add Course
                  </Button>
                </div>
              </div>
              <Button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save Profile</Button>
              {profileSaved && <InlineMessage type="success" message="Profile saved!" />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="mt-4">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold">GitHub Connection</CardTitle>
              <CardDescription className="text-xs">Link your repository for milestone tracking (no OAuth needed)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Repository URL or Name</Label>
                <Input placeholder="e.g. owner/repo-name or https://github.com/owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="bg-background text-sm mt-1" />
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <FiGitBranch className="w-4 h-4 mr-2" />Save Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 space-y-4">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HiOutlineBell className="w-4 h-4 text-emerald-400" />Reminder Schedule
              </CardTitle>
              <CardDescription className="text-xs">Daily deadline reminders powered by the Deadline Reminder Agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {schedLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${schedule?.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-semibold">{schedule?.is_active ? 'Active' : 'Paused'}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Schedule</p>
                      <p className="text-sm font-semibold">{schedule?.cron_expression ? cronToHuman(schedule.cron_expression) : 'Loading...'}</p>
                      <p className="text-[10px] text-muted-foreground">{schedule?.timezone ?? 'America/New_York'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Next Run</p>
                      <p className="text-sm font-semibold">{schedule?.next_run_time ? new Date(schedule.next_run_time).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Run</p>
                      <p className="text-sm font-semibold">{schedule?.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : 'Never'}</p>
                      {schedule?.last_run_success !== null && schedule?.last_run_success !== undefined && (
                        <Badge variant="outline" className={`text-[10px] ${schedule.last_run_success ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'}`}>
                          {schedule.last_run_success ? 'Success' : 'Failed'}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleToggleSchedule} disabled={toggleLoading} variant="outline" className="flex-1">
                      {toggleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : schedule?.is_active ? <FiPause className="w-4 h-4 mr-2" /> : <FiPlay className="w-4 h-4 mr-2" />}
                      {schedule?.is_active ? 'Pause Schedule' : 'Resume Schedule'}
                    </Button>
                    <Button onClick={handleTriggerNow} disabled={triggerLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1">
                      {triggerLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FiPlay className="w-4 h-4 mr-2" />}
                      Trigger Now
                    </Button>
                  </div>

                  {schedError && <InlineMessage type="error" message={schedError} />}
                  {schedSuccess && <InlineMessage type="success" message={schedSuccess} />}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Execution History</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No execution history yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-md bg-secondary/50 border border-border">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${log?.success ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-medium">{log?.success ? 'Success' : 'Failed'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{log?.executed_at ? new Date(log.executed_at).toLocaleString() : ''}</span>
                      <span className="text-[10px] text-muted-foreground">Attempt {log?.attempt ?? 1}/{log?.max_attempts ?? 1}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={loadScheduleData} className="w-full mt-2 text-xs">
                <HiOutlineArrowPath className="w-3 h-3 mr-1" />Refresh
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================================
// Agent Status Bar
// ============================================================================

function AgentStatusBar({ activeAgentId }: { activeAgentId: string | null }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <Card className="bg-card border-border shadow-md">
      <CardContent className="p-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full text-left">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${activeAgentId ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="text-xs font-medium">{activeAgentId ? `Agent active: ${AGENTS.find(a => a.id === activeAgentId)?.name ?? 'Unknown'}` : 'All agents idle'}</span>
          </div>
          <HiOutlineChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>
        {expanded && (
          <div className="mt-2 pt-2 border-t border-border space-y-1.5">
            {AGENTS.map((agent) => (
              <div key={agent.id} className="flex items-center gap-2 px-1">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeAgentId === agent.id ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{agent.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{agent.purpose}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function Page() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [sampleData, setSampleData] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [studyPlan, setStudyPlan] = useState<StudyPlanData | null>(null)
  const [githubData, setGithubData] = useState<GitHubData | null>(null)
  const [deadlines, setDeadlines] = useState<DeadlineData | null>(null)
  const [resources, setResources] = useState<ResourceData | null>(null)

  useEffect(() => {
    if (sampleData) {
      setStudyPlan(SAMPLE_STUDY_PLAN)
      setGithubData(SAMPLE_GITHUB)
      setDeadlines(SAMPLE_DEADLINES)
      setResources(SAMPLE_RESOURCES)
    } else {
      setStudyPlan(null)
      setGithubData(null)
      setDeadlines(null)
      setResources(null)
    }
  }, [sampleData])

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <HiOutlineChartBar className="w-5 h-5" /> },
    { id: 'plan', label: 'Plan', icon: <HiOutlineCalendar className="w-5 h-5" /> },
    { id: 'milestones', label: 'Milestones', icon: <FiTarget className="w-5 h-5" /> },
    { id: 'resources', label: 'Resources', icon: <HiOutlineBookOpen className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <HiOutlineCog6Tooth className="w-5 h-5" /> },
  ]

  const urgentCount = deadlines?.urgent_count ?? 0

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground font-sans">
        <div className="flex h-screen overflow-hidden">
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
          )}
          <aside className={`fixed md:static inset-y-0 left-0 z-40 w-56 bg-card border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <HiOutlineAcademicCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight">StudySync</h1>
                  <p className="text-[10px] text-muted-foreground">AI Study Planner</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => (
                <button key={item.id} onClick={() => { setActiveScreen(item.id); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${activeScreen === item.id ? 'bg-emerald-600/20 text-emerald-400' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-3">
              <AgentStatusBar activeAgentId={activeAgentId} />
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button className="md:hidden p-1.5 rounded-md hover:bg-secondary" onClick={() => setSidebarOpen(true)}>
                  <FiLayers className="w-5 h-5" />
                </button>
                <h2 className="text-sm font-semibold tracking-tight capitalize">{activeScreen}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
                  <Switch id="sample-toggle" checked={sampleData} onCheckedChange={setSampleData} />
                </div>
                <Separator orientation="vertical" className="h-6" />
                <button className="relative p-1.5 rounded-md hover:bg-secondary transition-colors" onClick={() => setActiveScreen('settings')}>
                  <HiOutlineBell className="w-5 h-5" />
                  {urgentCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">{urgentCount}</span>
                  )}
                </button>
                <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center">
                  <HiOutlineUser className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto">
              <div className="p-4 md:p-6 max-w-6xl mx-auto">
                {activeScreen === 'dashboard' && (
                  <DashboardScreen
                    studyPlan={studyPlan}
                    deadlines={deadlines}
                    githubData={githubData}
                    onNavigate={setActiveScreen}
                    activeAgentId={activeAgentId}
                    onGeneratePlan={() => setActiveScreen('plan')}
                    onSyncGithub={() => setActiveScreen('milestones')}
                  />
                )}
                {activeScreen === 'plan' && (
                  <PlanScreen
                    studyPlan={studyPlan}
                    setStudyPlan={setStudyPlan}
                    activeAgentId={activeAgentId}
                    setActiveAgentId={setActiveAgentId}
                  />
                )}
                {activeScreen === 'milestones' && (
                  <MilestonesScreen
                    githubData={githubData}
                    setGithubData={setGithubData}
                    deadlines={deadlines}
                    activeAgentId={activeAgentId}
                    setActiveAgentId={setActiveAgentId}
                  />
                )}
                {activeScreen === 'resources' && (
                  <ResourcesScreen
                    resources={resources}
                    setResources={setResources}
                    activeAgentId={activeAgentId}
                    setActiveAgentId={setActiveAgentId}
                  />
                )}
                {activeScreen === 'settings' && (
                  <SettingsScreen
                    activeAgentId={activeAgentId}
                    setActiveAgentId={setActiveAgentId}
                    setDeadlines={setDeadlines}
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
