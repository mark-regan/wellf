import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HouseholdLayout } from './Household';
import {
  Wrench,
  Plus,
  Thermometer,
  Droplets,
  Zap,
  TreeDeciduous,
  CheckCircle2,
  Clock,
  Trash2,
  AlertTriangle,
  Sparkles,
  Shield,
  Settings,
} from 'lucide-react';
import { householdApi } from '@/api/household';
import {
  MaintenanceTask,
  MaintenanceLog,
  CreateMaintenanceTaskRequest,
  LogMaintenanceRequest,
  MaintenanceCategory,
  MaintenancePriority,
} from '@/types';
import { formatCurrency } from '@/utils/format';

const MAINTENANCE_CATEGORIES: { value: MaintenanceCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'hvac', label: 'HVAC', icon: <Thermometer className="h-4 w-4" /> },
  { value: 'plumbing', label: 'Plumbing', icon: <Droplets className="h-4 w-4" /> },
  { value: 'electrical', label: 'Electrical', icon: <Zap className="h-4 w-4" /> },
  { value: 'appliance', label: 'Appliance', icon: <Settings className="h-4 w-4" /> },
  { value: 'garden', label: 'Garden', icon: <TreeDeciduous className="h-4 w-4" /> },
  { value: 'cleaning', label: 'Cleaning', icon: <Sparkles className="h-4 w-4" /> },
  { value: 'safety', label: 'Safety', icon: <Shield className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <Wrench className="h-4 w-4" /> },
];

const PRIORITIES: { value: MaintenancePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500/20 text-yellow-600' },
  { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-600' },
  { value: 'urgent', label: 'Urgent', color: 'bg-destructive/20 text-destructive' },
];

const getCategoryIcon = (category: MaintenanceCategory) => {
  const cat = MAINTENANCE_CATEGORIES.find((c) => c.value === category);
  return cat?.icon || <Wrench className="h-4 w-4" />;
};

const getPriorityColor = (priority: MaintenancePriority) => {
  const p = PRIORITIES.find((pr) => pr.value === priority);
  return p?.color || 'bg-muted text-muted-foreground';
};

export function HouseholdMaintenance() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [filter, setFilter] = useState<'active' | 'overdue' | 'all'>('active');
  const [newTask, setNewTask] = useState<CreateMaintenanceTaskRequest>({
    name: '',
    category: 'hvac',
    priority: 'medium',
  });
  const [completeData, setCompleteData] = useState<LogMaintenanceRequest>({});

  const loadData = async () => {
    try {
      const [tasksData, logsData] = await Promise.all([
        householdApi.listMaintenanceTasks({ all: filter === 'all' }),
        householdApi.getMaintenanceLogs(undefined, 10),
      ]);
      setTasks(tasksData);
      setLogs(logsData);
    } catch (error) {
      console.error('Failed to load maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filter]);

  const handleAddTask = async () => {
    try {
      await householdApi.createMaintenanceTask(newTask);
      setShowAddDialog(false);
      setNewTask({ name: '', category: 'hvac', priority: 'medium' });
      loadData();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    try {
      await householdApi.completeMaintenanceTask(selectedTask.id, completeData);
      setShowCompleteDialog(false);
      setSelectedTask(null);
      setCompleteData({});
      loadData();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await householdApi.deleteMaintenanceTask(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const activeTasks = tasks.filter((t) => t.is_active);
  const overdueTasks = tasks.filter((t) => t.is_overdue);
  const dueSoonTasks = tasks.filter(
    (t) => t.days_until_due !== undefined && t.days_until_due <= 7 && t.days_until_due >= 0
  );

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'overdue') return task.is_overdue;
    if (filter === 'active') return task.is_active;
    return true;
  });

  return (
    <HouseholdLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Maintenance</h1>
            <p className="text-muted-foreground">Schedule and track home maintenance</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-household hover:bg-household/90">
                <Plus className="mr-2 h-4 w-4" /> Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Maintenance Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Task Name</Label>
                  <Input
                    id="name"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    placeholder="e.g., Annual boiler service"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newTask.category}
                      onValueChange={(v) => setNewTask({ ...newTask, category: v as MaintenanceCategory })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MAINTENANCE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              {cat.icon}
                              {cat.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(v) => setNewTask({ ...newTask, priority: v as MaintenancePriority })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={newTask.frequency || ''}
                      onValueChange={(v) => setNewTask({ ...newTask, frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="biannually">Twice a Year</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                        <SelectItem value="as_needed">As Needed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next_due">Next Due Date</Label>
                    <Input
                      id="next_due"
                      type="date"
                      value={newTask.next_due_date || ''}
                      onChange={(e) => setNewTask({ ...newTask, next_due_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newTask.description || ''}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Optional notes about this task"
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimated_cost">Estimated Cost</Label>
                    <Input
                      id="estimated_cost"
                      type="number"
                      value={newTask.estimated_cost || ''}
                      onChange={(e) =>
                        setNewTask({ ...newTask, estimated_cost: parseFloat(e.target.value) || undefined })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="typical_provider">Typical Provider</Label>
                    <Input
                      id="typical_provider"
                      value={newTask.typical_provider || ''}
                      onChange={(e) => setNewTask({ ...newTask, typical_provider: e.target.value })}
                      placeholder="e.g., British Gas"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTask} disabled={!newTask.name}>
                    Add Task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Active Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : activeTasks.length}</div>
              <p className="text-xs text-muted-foreground">Scheduled tasks</p>
            </CardContent>
          </Card>
          <Card className={overdueTasks.length > 0 ? 'border-destructive' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-destructive' : ''}`}>
                {loading ? '--' : overdueTasks.length}
              </div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Due Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : dueSoonTasks.length}</div>
              <p className="text-xs text-muted-foreground">Within 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '--' : logs.length}</div>
              <p className="text-xs text-muted-foreground">Recent completions</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
          >
            Active ({activeTasks.length})
          </Button>
          <Button
            variant={filter === 'overdue' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setFilter('overdue')}
          >
            Overdue ({overdueTasks.length})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
        </div>

        {/* Tasks List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading maintenance tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-8 text-center">
                <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {filter === 'overdue' ? 'No overdue tasks' : 'No maintenance tasks yet'}
                </p>
                {filter !== 'overdue' && (
                  <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Your First Task
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 ${
                      task.is_overdue ? 'bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          task.is_overdue
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-household/20 text-household'
                        }`}
                      >
                        {getCategoryIcon(task.category)}
                      </div>
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="capitalize">{task.category}</span>
                          {task.frequency && (
                            <>
                              <span>·</span>
                              <span className="capitalize">{task.frequency.replace('_', ' ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded-full text-xs capitalize ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <div className="text-right min-w-[100px]">
                        {task.is_overdue ? (
                          <span className="text-sm font-medium text-destructive">
                            {Math.abs(task.days_until_due ?? 0)} days overdue
                          </span>
                        ) : task.days_until_due !== undefined ? (
                          <span className="text-sm text-muted-foreground">
                            {task.days_until_due === 0
                              ? 'Due today'
                              : task.days_until_due === 1
                                ? 'Due tomorrow'
                                : `In ${task.days_until_due} days`}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">No due date</span>
                        )}
                        {task.estimated_cost && (
                          <p className="text-xs text-muted-foreground">
                            Est. {formatCurrency(task.estimated_cost, 'GBP')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant={task.is_overdue ? 'destructive' : 'default'}
                          onClick={() => {
                            setSelectedTask(task);
                            setShowCompleteDialog(true);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completions */}
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-household" />
                Recent Completions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{log.task_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.completed_date).toLocaleDateString()}
                        {log.provider && ` · ${log.provider}`}
                      </p>
                    </div>
                    {log.cost && (
                      <span className="font-medium">{formatCurrency(log.cost, log.currency)}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Task Dialog */}
        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Task: {selectedTask?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="completed_date">Completed Date</Label>
                <Input
                  id="completed_date"
                  type="date"
                  value={completeData.completed_date || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCompleteData({ ...completeData, completed_date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={completeData.cost || ''}
                    onChange={(e) =>
                      setCompleteData({ ...completeData, cost: parseFloat(e.target.value) || undefined })
                    }
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Input
                    id="provider"
                    value={completeData.provider || selectedTask?.typical_provider || ''}
                    onChange={(e) => setCompleteData({ ...completeData, provider: e.target.value })}
                    placeholder="Who did the work?"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="work_done">Work Done</Label>
                <Textarea
                  id="work_done"
                  value={completeData.work_done || ''}
                  onChange={(e) => setCompleteData({ ...completeData, work_done: e.target.value })}
                  placeholder="Describe the work completed"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={completeData.notes || ''}
                  onChange={(e) => setCompleteData({ ...completeData, notes: e.target.value })}
                  placeholder="Any additional notes"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCompleteTask}>Mark Complete</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </HouseholdLayout>
  );
}
