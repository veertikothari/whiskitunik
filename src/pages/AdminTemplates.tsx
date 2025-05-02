import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { Plus, Copy, Edit, Trash2 } from 'lucide-react';

interface TaskType {
  title?: string;
  description?: string;
  assignedUserId?: string;
  referenceContactId?: string;
  status?: string;
  guidelineId?: string; // Added to support guidelines
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  tasks?: TaskType[];
  templateDueDate: string;
  parentTemplateName?: string; // Added to store parent template name
}

interface Guideline {
  id: string;
  title: string;
  description: string;
}

export function Templates() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [guidelines, setGuidelines] = useState<Guideline[]>([]); // State for guidelines
  const [newTemplate, setNewTemplate] = useState<Omit<ProjectTemplate, 'id'>>({
    name: '',
    description: '',
    tasks: [],
    templateDueDate: new Date().toISOString().split('T')[0],
    parentTemplateName: '' // Added to initialize parent template name
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [useTemplateId, setUseTemplateId] = useState<string | null>(null); // Track which template is being used
  const [parentTemplateName, setParentTemplateName] = useState<string>(''); // State for parent template name input
  const [isTasksOpen, setIsTasksOpen] = useState<boolean>(false);
  const getToday = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchTemplates();
    fetchUsersAndContacts();
    fetchGuidelines(); // Fetch guidelines
    const userNames = users.map(user => user.name);
    console.log(userNames); // Logs: ['Nikesh Gala', 'Urvi Gala', 'Veerti Kothari']
}, [users]
);

  const fetchTemplates = async () => {
    const snapshot = await getDocs(collection(db, 'projectTemplates'));
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ProjectTemplate[];
    setTemplates(list);
  };

  const fetchUsersAndContacts = async () => {
    const usersSnap = await getDocs(collection(db, 'users'));
    const contactsSnap = await getDocs(collection(db, 'contacts'));
    setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setContacts(contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchGuidelines = async () => {
    const guidelinesSnap = await getDocs(collection(db, 'guidelines'));
    setGuidelines(guidelinesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Guideline)));
  };
    

  const handleAddTask = () => {
    setNewTemplate(prev => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        {
          title: '',
          description: '',
          assignedUserId: '',
          referenceContactId: '',
          status: 'pending',
          guidelineId: '' // Initialize with empty guidelineId
        }
      ]
    }));
  }


  const handleTaskChange = (
    index: number,
    field: keyof TaskType,
    value: string
  ) => {
    const updated = [...newTemplate.tasks];
    updated[index][field] = value;
    setNewTemplate(prev => ({ ...prev, tasks: updated }));
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.description) return;

    const templateRef = collection(db, 'projectTemplates');
    await addDoc(templateRef, newTemplate);
    await fetchTemplates();

    setNewTemplate({ name: '', description: '', tasks: [], templateDueDate: getToday(), parentTemplateName: '' });
    (document.getElementById('createTemplateModal') as HTMLDialogElement).close();
  };

  const handleUseTemplate = async (template: ProjectTemplate) => {
    setUseTemplateId(template.id); // Set the template being used
    (document.getElementById('useTemplateModal') as HTMLDialogElement).showModal();
  };

  const handleConfirmUseTemplate = async () => {
    if (!useTemplateId || !parentTemplateName) return;

    const template = templates.find(t => t.id === useTemplateId);
    if (!template) return;

    const useDate = new Date(); // Date when "Use" is clicked
    const dueDate = new Date(useDate);
    dueDate.setDate(useDate.getDate() + 10); // Set due date 10 days ahead
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const taskRef = collection(db, 'tasks');
    for (const task of template.tasks) {
      await addDoc(taskRef, {
        ...task,
        title: parentTemplateName ? `${parentTemplateName}: ${task.title}` : task.title, // Prepend parent name
        dueDate: dueDateStr,
        guidelineId: task.guidelineId, // Include guidelineId
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    alert('Tasks activated successfully with due date set to 10 days from today');

    setUseTemplateId(null);
    setParentTemplateName('');
    (document.getElementById('useTemplateModal') as HTMLDialogElement).close();
  };

  const handleDeleteTemplate = async (templateId: string) => {
    await deleteDoc(doc(db, 'projectTemplates', templateId));
    setTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  const handleEditTemplate = (template: ProjectTemplate) => {
    setNewTemplate({
      name: template.name,
      description: template.description,
      tasks: template.tasks,
      templateDueDate: template.templateDueDate,
      parentTemplateName: template.parentTemplateName || '' // Include parent template name
    });
    setEditingTemplateId(template.id);
    (document.getElementById('createTemplateModal') as HTMLDialogElement).showModal();
  };

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateId) return;

    const ref = doc(db, 'projectTemplates', editingTemplateId);
    await updateDoc(ref, newTemplate);
    setEditingTemplateId(null);
    setNewTemplate({ name: '', description: '', tasks: [], templateDueDate: getToday(), parentTemplateName: '' });
    await fetchTemplates();
    (document.getElementById('createTemplateModal') as HTMLDialogElement).close();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Project Templates</h1>
        <button
          onClick={() =>
            (document.getElementById('createTemplateModal') as HTMLDialogElement).showModal()
          }
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          New Template
        </button>
      </div>

      {templates.map(template => (
        <div key={template.id} className="bg-white rounded-lg shadow p-6 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">{template.name}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleUseTemplate(template)}
                className="text-blue-600 hover:underline flex items-center"
              >
                <Copy className="h-4 w-4 mr-1" /> Use
              </button>
              <button
                onClick={() => handleEditTemplate(template)}
                className="text-green-600 hover:underline flex items-center"
              >
                <Edit className="h-4 w-4 mr-1" /> Edit
              </button>
              <button
                onClick={() => handleDeleteTemplate(template.id)}
                className="text-red-600 hover:underline flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </button>
            </div>
          </div>
          <p className="text-gray-600">{template.description}</p>
          <p className="text-sm text-gray-500 mb-2">Due Date: {template.templateDueDate}</p>
          {template.parentTemplateName && (
            <p className="text-sm text-gray-500">Parent Template: {template.parentTemplateName}</p>
          )}
          <div className="mt-4">
            <h4 className="font-medium mb-2">Tasks:</h4>
            <ul className="pl-4 list-disc space-y-1 text-sm text-gray-700">
              {template.tasks.map((task, i) => (
                <li key={i}>
                  {task.title} — {task.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      <dialog id="createTemplateModal" className="modal bg-white rounded shadow p-6 w-full max-w-3xl">
        <form onSubmit={editingTemplateId ? handleUpdateTemplate : handleCreateTemplate}>
          <h2 className="text-xl font-bold mb-4">{editingTemplateId ? 'Edit' : 'Create'} Template</h2>
          <input
            type="text"
            placeholder="Template Name"
            className="w-full border px-3 py-2 mb-3 rounded"
            value={newTemplate.name}
            onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
            required
          />
          <textarea
            placeholder="Template Description"
            className="w-full border px-3 py-2 mb-3 rounded"
            value={newTemplate.description}
            onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
            required
          />
          <input
            type="date"
            className="w-full border px-3 py-2 mb-3 rounded"
            value={newTemplate.templateDueDate}
            min={getToday()}
            onChange={e => setNewTemplate({ ...newTemplate, templateDueDate: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Parent Template Name"
            className="w-full border px-3 py-2 mb-3 rounded"
            value={newTemplate.parentTemplateName || ''}
            onChange={e => setNewTemplate({ ...newTemplate, parentTemplateName: e.target.value })}
          />

          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Tasks</span>
              <button
                type="button"
                onClick={isTasksOpen ? handleCloseTasks : handleAddTask}
                className="text-blue-600 text-sm"
              >
                + Add Task
              </button>
            </div>
            {newTemplate.tasks.map((task, i) => (
              <div key={i} className="border p-3 mb-3 rounded space-y-2">
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded"
                  placeholder="Task Title"
                  value={task.title}
                  onChange={e => handleTaskChange(i, 'title', e.target.value)}
                  
                />
                <textarea
                  className="w-full border px-2 py-1 rounded"
                  placeholder="Task Description + References"
                  value={task.description}
                  onChange={e => handleTaskChange(i, 'description', e.target.value)}
                  
                />
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={task.assignedUserId}
                  onChange={e => handleTaskChange(i, 'assignedUserId', e.target.value)}
                  
                >
                  <option value="">Assign to...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={task.referenceContactId}
                  onChange={e => handleTaskChange(i, 'referenceContactId', e.target.value)}
                  
                >
                  <option value="">Reference contact...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={task.guidelineId || ''}
                  onChange={e => handleTaskChange(i, 'guidelineId', e.target.value)}
                >
                  <option value="">Select guideline...</option>
                  {guidelines.map(guideline => (
                    <option key={guideline.id} value={guideline.id}>
                      {guideline.title}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => {
              setEditingTemplateId(null);
              (document.getElementById('createTemplateModal') as HTMLDialogElement).close();
            }} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              {editingTemplateId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </dialog>

      <dialog id="useTemplateModal" className="modal bg-white rounded shadow p-6 w-full max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); handleConfirmUseTemplate(); }}>
          <h2 className="text-xl font-bold mb-4">Use Template</h2>
          <label className="block mb-2">Parent Template Name</label>
          <input
            type="text"
            placeholder="Enter Parent Template Name"
            className="w-full border px-3 py-2 mb-3 rounded"
            value={parentTemplateName}
            onChange={(e) => setParentTemplateName(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => {
              setUseTemplateId(null);
              setParentTemplateName('');
              (document.getElementById('useTemplateModal') as HTMLDialogElement).close();
            }} className="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Confirm</button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

export default Templates;