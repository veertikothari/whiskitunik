import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

interface TimeLogEntry {
  date: string;
  hours: number;
  userId: string;
}

interface Task {
  id: string;
  timeLogs?: TimeLogEntry[];
}

interface User {
  id: string;
  name: string;
}

interface UserEfficiency {
  userId: string;
  name: string; // Added to store user name
  totalHours: number;
  taskCount: number;
  avgHoursPerTask: number;
}

export function TimeLog() {
  const [efficiencyData, setEfficiencyData] = useState<UserEfficiency[]>([]);
  const [users, setUsers] = useState<User[]>([]); // State to store user data
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEfficiencyData = async () => {
      // Fetch users to map IDs to names
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersList);

      const taskSnap = await getDocs(collection(db, 'tasks'));

      const efficiencyMap: { [userId: string]: { totalHours: number; taskCount: number } } = {};

      taskSnap.docs.forEach(docSnap => {
        const task = docSnap.data() as Task;
        const uniqueUsers = new Set<string>();

        task.timeLogs?.forEach(log => {
          const userId = log.userId;
          uniqueUsers.add(userId);

          if (!efficiencyMap[userId]) {
            efficiencyMap[userId] = { totalHours: 0, taskCount: 0 };
          }

          efficiencyMap[userId].totalHours += log.hours;
        });

        uniqueUsers.forEach(userId => {
          efficiencyMap[userId].taskCount += 1;
        });
      });

      const result: UserEfficiency[] = Object.entries(efficiencyMap).map(([userId, data]) => {
        const user = usersList.find(u => u.id === userId);
        return {
          userId,
          name: user ? user.name : userId, // Use name if found, otherwise fallback to userId
          totalHours: parseFloat(data.totalHours.toFixed(2)),
          taskCount: data.taskCount,
          avgHoursPerTask: data.taskCount > 0 ? parseFloat((data.totalHours / data.taskCount).toFixed(2)) : 0,
        };
      });

      setEfficiencyData(result);
      setLoading(false);
    };

    fetchEfficiencyData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Efficiency Report</h1>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : efficiencyData.length === 0 ? (
        <p className="text-gray-500">No time logs found.</p>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Total Hours by User</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={efficiencyData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" /> {/* Changed from userId to name */}
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalHours" fill="#3b82f6" name="Total Hours" />
                <Bar dataKey="avgHoursPerTask" fill="#10b981" name="Avg Hours/Task" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table Summary */}
          <div className="bg-white rounded-lg shadow p-6 overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-3 border">User Name</th> {/* Changed from User ID */}
                  <th className="p-3 border">Total Hours</th>
                  <th className="p-3 border">Tasks Involved</th>
                  <th className="p-3 border">Avg Hours / Task</th>
                </tr>
              </thead>
              <tbody>
                {efficiencyData.map(user => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="p-3 border">{user.name}</td> {/* Changed from userId to name */}
                    <td className="p-3 border">{user.totalHours}</td>
                    <td className="p-3 border">{user.taskCount}</td>
                    <td className="p-3 border">{user.avgHoursPerTask}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}