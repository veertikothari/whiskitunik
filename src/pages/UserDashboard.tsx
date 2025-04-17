import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  arrayUnion,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

type Contact = {
  name: string;
  email: string;
  phone: string;
};

type TimeLog = {
  date: string;
  hours: number;
  userId?: string;
};

type Task = {
  id: string;
  title: string;
  description: string;
  status?: string;
  assignedUserId?: string;
  referenceContactId?: string;
  timeLogs?: TimeLog[];
  referenceContact?: Contact;
};

export const UserDashboard = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeInputs, setTimeInputs] = useState<{ [taskId: string]: string }>({});
  const [userId, setUserId] = useState<string | null>(null);

  const navigate = useNavigate();
  const email = localStorage.getItem('userEmail');

  useEffect(() => {
    if (!email) {
      navigate('/');
      return;
    }

    const fetchUserTasks = async () => {
      try {
        setLoading(true);

        const usersRef = collection(db, 'users');
        const userQuery = query(usersRef, where('email', '==', email));
        const userSnap = await getDocs(userQuery);

        if (userSnap.empty) {
          throw new Error('User not found.');
        }

        const currentUserId = userSnap.docs[0].id;
        setUserId(currentUserId);

        const tasksRef = collection(db, 'tasks');
        const tasksQuery = query(tasksRef, where('assignedUserId', '==', currentUserId));
        const tasksSnap = await getDocs(tasksQuery);

        const taskList: Task[] = await Promise.all(
          tasksSnap.docs.map(async (docSnap) => {
            const data = docSnap.data();
            let referenceContact: Contact | undefined;

            if (data.referenceContactId) {
              const contactRef = doc(db, 'contacts', data.referenceContactId);
              const contactSnap = await getDoc(contactRef);
              if (contactSnap.exists()) {
                referenceContact = contactSnap.data() as Contact;
              }
            }

            return {
              id: docSnap.id,
              title: data.title,
              description: data.description,
              status: data.status,
              assignedUserId: data.assignedUserId,
              referenceContactId: data.referenceContactId,
              timeLogs: data.timeLogs || [],
              referenceContact,
            };
          })
        );

        setTasks(taskList);
        setError('');
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setError('Failed to fetch tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchUserTasks();
  }, [email, navigate]);

  const handleTimeInputChange = (taskId: string, value: string) => {
    setTimeInputs((prev) => ({ ...prev, [taskId]: value }));
  };

  const handleSubmitTime = async (taskId: string) => {
    const hours = parseFloat(timeInputs[taskId]);
    if (isNaN(hours) || hours <= 0 || !userId) return;

    const today = new Date().toISOString().split('T')[0];
    const task = tasks.find((t) => t.id === taskId);
    const alreadyLogged = task?.timeLogs?.some((log) => log.date === today);

    if (alreadyLogged) return;

    const taskRef = doc(db, 'tasks', taskId);
    const newTimeLog: TimeLog = {
      date: today,
      hours,
      userId: userId,
    };

    try {
      await updateDoc(taskRef, {
        timeLogs: arrayUnion(newTimeLog),
      });

      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, timeLogs: [...(task.timeLogs || []), newTimeLog] }
            : task
        )
      );

      setTimeInputs((prev) => ({ ...prev, [taskId]: '' }));
    } catch (err) {
      console.error('Error updating time log:', err);
      setError('Failed to submit time');
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { status });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status } : task
        )
      );
    } 
    catch (err) {
      console.error('Error updating task status:', err);
      setError('Failed to update task status');
    }
  };

  if (loading) return <div className="p-6 text-gray-500 text-center">Loading tasks...</div>;
  if (error) return <div className="p-6 text-red-500 text-center">{error}</div>;

  const activeTasks = tasks.filter(task => task.status !== 'completed');

  return (
    <div className="min-h-full w-full bg-gray-50 px-4 py-6">
      <div className="w-full px-2 sm:px-6 lg:px-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">Hi, {email}</h1>
        <h2 className="text-lg md:text-xl font-medium text-gray-600 mb-6">Here are your tasks:</h2>
  
        <div className="max-h-[70vh] overflow-y-auto pr-2 rounded-lg">
          {activeTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">You have no active tasks right now.</p>
          ) : (
            <ul className="space-y-6">
              {activeTasks.map((task) => {
                const today = new Date().toISOString().split('T')[0];
                const hasLoggedToday = task.timeLogs?.some((log) => log.date === today);
                const canLogTime = task.status === 'in_progress' && !hasLoggedToday;
  
                return (
                  <li key={task.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                      </div>
                      <span className={`text-xs sm:text-sm font-medium px-3 py-1 rounded-full self-start sm:self-auto ${
                        task.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : task.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {task.status === 'in_progress' ? 'in_progress' : task.status || 'Not started'}
                      </span>
                    </div>
  
                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        className="bg-yellow-400 text-white text-xs px-4 py-1.5 rounded-full hover:bg-yellow-500 transition disabled:opacity-50"
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        disabled={task.status === 'in_progress'}
                      >
                        Mark In Progress
                      </button>
                      <button
                        className="bg-green-500 text-white text-xs px-4 py-1.5 rounded-full hover:bg-green-600 transition"
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                      >
                        Mark Completed
                      </button>
                    </div>
  
                    {task.status === 'in_progress' && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <label className="text-sm font-medium text-gray-700 block mb-1">
                          Hours spent today
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="e.g. 2"
                            className="border border-gray-300 rounded-md px-3 py-1.5 w-24 text-sm"
                            value={timeInputs[task.id] || ''}
                            onChange={(e) => handleTimeInputChange(task.id, e.target.value)}
                            disabled={!canLogTime}
                          />
                          <button
                            className={`text-sm px-4 py-1.5 rounded-md transition-colors ${
                              canLogTime
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                            onClick={() => handleSubmitTime(task.id)}
                            disabled={!canLogTime}
                          >
                            {hasLoggedToday ? 'Already Submitted' : 'Submit'}
                          </button>
                        </div>
                      </div>
                    )}
  
                    {task.timeLogs?.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Time Logs</h4>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc ml-5">
                          {task.timeLogs.map((log, index) => (
                            <li key={index}>
                              {log.date}: {log.hours} hour{log.hours !== 1 ? 's' : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
  
                    {task.referenceContact && (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Reference Contact</h4>
                        <p className="text-sm text-gray-600"><strong>Name:</strong> {task.referenceContact.name}</p>
                        <p className="text-sm text-gray-600"><strong>Email:</strong> {task.referenceContact.email}</p>
                        <p className="text-sm text-gray-600"><strong>Phone:</strong> {task.referenceContact.phone}</p>
  
                        <div className="flex gap-3 mt-3">
                          <a
                            href={`tel:${task.referenceContact.phone}`}
                            className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-md hover:bg-blue-600 transition-colors"
                          >
                            Call
                          </a>
                          <a
                            href={`https://wa.me/${task.referenceContact.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm bg-green-500 text-white px-3 py-1.5 rounded-md hover:bg-green-600 transition-colors"
                          >
                            WhatsApp
                          </a>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
