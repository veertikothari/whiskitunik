import { useEffect, useState } from 'react';
import { CircleUser, Clock, FileText, Users } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  assignedUserId: string;
  referenceContactId?: string;
  timeLogs?: { date: string; hours: number }[];
}

export function Dashboard() {
  const [activeTasks, setActiveTasks] = useState<number>(0);
  const [totalContacts, setTotalContacts] = useState<number>(0);
  const [hoursLogged, setHoursLogged] = useState<number>(0);
  const [teamMembers, setTeamMembers] = useState<number>(0);
  const [userTasks, setUserTasks] = useState<Task[]>([]);

  const email = localStorage.getItem('userEmail');
  useEffect(() => {
    const fetchStats = async () => {
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const contactsSnap = await getDocs(collection(db, 'contacts'));
      const usersSnap = await getDocs(collection(db, 'users'));

      let activeCount = 0;
      let hours = 0;

      tasksSnap.forEach(doc => {
        const data = doc.data();
        if (data.status !== 'completed') activeCount++;
        if (data.timeLogs) {
          data.timeLogs.forEach((log: { hours: number }) => {
            hours += log.hours || 0;
          });
        }
      });

      setActiveTasks(activeCount);
      setHoursLogged(hours);
      setTotalContacts(contactsSnap.size);
      setTeamMembers(usersSnap.size);
    };

    const fetchUserTasks = async () => {
      if (!email) return;
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('assignedUserId', '==', email));
      const snapshot = await getDocs(q);

      const filteredTasks: Task[] = snapshot.docs
        .map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title,
            description: data.description,
            status: data.status,
            assignedUserId: data.assignedUserId,
            referenceContactId: data.referenceContactId,
            timeLogs: data.timeLogs || [],
          };
        })
        .filter(task => task.status !== 'completed');

      setUserTasks(filteredTasks);
    };

    fetchStats();
    fetchUserTasks();
  }, [email]);

  const stats = [
    { label: 'Active Tasks', value: activeTasks.toString(), icon: FileText },
    { label: 'Total Contacts', value: totalContacts.toString(), icon: Users },
    { label: 'Hours Logged', value: hoursLogged.toString(), icon: Clock },
    { label: 'Team Members', value: teamMembers.toString(), icon: CircleUser },
  ];
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div 
              key={stat.label} 
              className="bg-white rounded-lg shadow p-6 flex items-center space-x-4"
            >
              <div className="p-3 bg-blue-100 rounded-full">
                <Icon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* User's tasks */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Tasks</h2>
      {userTasks.length === 0 ? (
        <p className="text-gray-500">No tasks assigned to you yet.</p>
      ) : (
        <ul className="space-y-4">
          {userTasks.map((task) => (
            <li key={task.id} className="bg-white shadow p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
              <p className="text-gray-600 mb-2">{task.description}</p>
              <p className="text-sm text-gray-500">Status: {task.status}</p>
              <p className="text-sm text-gray-500">
                Total hours logged: {task.timeLogs?.reduce((sum, log) => sum + (log.hours || 0), 0)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export default Dashboard