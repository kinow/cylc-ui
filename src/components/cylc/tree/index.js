/**
 * Copyright (C) NIWA & British Crown (Met Office) & Contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// eslint-disable-next-line no-unused-vars
import CylcTree from '@/components/cylc/tree/cylc-tree'

/**
 * These are the properties that are displayed on each Job detail, the leaf node of the tree.
 * @type {({property: string, title: string}|{property: string, title: string}|{property: string, title: string}|{property: string, title: string}|{property: string, title: string})[]}
 */
const JOB_DETAIL_NODE_PROPERTIES = [
  {
    title: 'host id',
    property: 'host'
  },
  {
    title: 'job id',
    property: 'batchSysJobId'
  },
  {
    title: 'batch sys',
    property: 'batchSysName'
  },
  {
    title: 'submit time',
    property: 'submittedTime'
  },
  {
    title: 'start time',
    property: 'startedTime'
  },
  {
    title: 'finish time',
    property: 'finishedTime'
  },
  {
    title: 'latest message',
    property: 'latestMessage'
  }
]

/**
 * The height of each tree item. In the infinite tree, it is used as value for the `.size` property.
 * @type {number}
 */
const TREE_ITEM_SIZE = 32

/**
 * Create a workflow node. Uses the same properties (by reference) as the given workflow,
 * only adding new properties such as type, children, etc.
 *
 * @param workflow {Object} workflow
 * @return {{id: string, type: string, node: Object, children: []}}
 */
function createWorkflowNode (workflow) {
  // Does not have the infinite-tree properties (size, state, etc) because this node is used only to build the
  // initial hierarchy. After that it is discarded, and we return its children (Cylc 7 did not display workflows
  // in the tree).
  return {
    id: workflow.id,
    type: 'workflow',
    node: workflow,
    children: []
  }
}

/**
 * Create a cycle point node. Uses the family proxy property `cyclePoint`.
 *
 * @param familyProxy {Object} family proxy
 * @return {{id: string, type: string, node: Object, children: [], size: number, state: Object}}
 */
function createCyclePointNode (familyProxy) {
  return {
    id: familyProxy.cyclePoint,
    type: 'cyclepoint',
    node: {
      id: familyProxy.cyclePoint,
      name: familyProxy.cyclePoint
    },
    children: [],
    // infinite-tree properties
    size: TREE_ITEM_SIZE,
    state: {
      open: true
    }
  }
}

/**
 * Create a family proxy node. Contains the same properties (by reference) as the given family,
 * only adding new properties such as type, children, etc.
 *
 * @param familyProxy {Object} family proxy
 * @return {{id: string, type: string, node: Object, children: [], size: number, state: Object}}
 */
function createFamilyProxyNode (familyProxy) {
  return {
    id: familyProxy.id,
    type: 'family-proxy',
    node: familyProxy,
    children: [],
    // infinite-tree properties
    size: TREE_ITEM_SIZE,
    state: {
      open: true
    }
  }
}

/**
 * Create a task proxy node. Contains the same properties (by reference) as the given task,
 * only adding new properties such as type, name, children, etc.
 *
 * @param taskProxy {Object} task proxy
 * @return {{id: string, type: string, expanded: boolean, node: Object, children: [], size: number, state: Object}}
 */
// TODO: move expanded state to data later for infinite-tree
function createTaskProxyNode (taskProxy) {
  // A TaskProxy could be a ghost node, which doesn't have a state/status yet
  if (!taskProxy.state) {
    taskProxy.state = ''
  }
  return {
    id: taskProxy.id,
    type: 'task-proxy',
    node: taskProxy,
    children: [],
    // infinite-tree properties
    size: TREE_ITEM_SIZE,
    state: {
      open: false
    }
  }
}

/**
 * Create a job node. Contains the same properties (by reference) as the given job,
 * only adding new properties such as type, name, etc.
 *
 * @param job {Object} job
 * @param [latestMessage] {string} latest message of the job's task, defaults to an empty string
 * @return {{node: Object, latestMessage: string}}
 * @return {{id: string, type: string, node: Object, children: [], latestMessage: string, children: [], size: number, state: Object}}
 */
// TODO: re-work the latest message, as this is the task latest message, not the job's...
function createJobNode (job, latestMessage = '') {
  // add job-leaf (details) in the hierarchy for infinite-tree
  const jobDetailsNode = {
    id: `${job.id}-details`,
    type: 'job-details',
    node: job,
    children: [],
    size: TREE_ITEM_SIZE * JOB_DETAIL_NODE_PROPERTIES.length, // 7 is the number of properties we are displaying
    state: {
      open: false
    }
  }
  return {
    id: job.id,
    type: 'job',
    node: job,
    latestMessage: latestMessage,
    children: [jobDetailsNode],
    // infinite-tree properties
    size: TREE_ITEM_SIZE,
    state: {
      open: false
    }
  }
}

function containsTreeData (workflow) {
  return workflow !== undefined &&
    workflow !== null &&
    workflow.cyclePoints && Array.isArray(workflow.cyclePoints) &&
    workflow.familyProxies && Array.isArray(workflow.familyProxies) &&
    workflow.taskProxies && Array.isArray(workflow.taskProxies)
}

/**
 * Populate the given tree using the also provided GraphQL workflow object.
 *
 * Every node has data, and a .name property used to display the node in the tree in the UI.
 *
 * @param tree {null|CylcTree} - A hierarchical tree
 * @param workflow {null|Object} - GraphQL workflow object
 * @throws {Error} - If the workflow or tree are either null or invalid (e.g. missing data)
 */
function populateTreeFromGraphQLData (tree, workflow) {
  if (!tree || !workflow || !containsTreeData(workflow)) {
    throw new Error('You must provide valid data to populate the tree!')
  }
  // the workflow object gets augmented to become a valid node for the tree
  const rootNode = createWorkflowNode(workflow)
  tree.setWorkflow(rootNode)
  for (const cyclePoint of workflow.cyclePoints) {
    const cyclePointNode = createCyclePointNode(cyclePoint)
    tree.addCyclePoint(cyclePointNode)
  }
  for (const familyProxy of workflow.familyProxies) {
    const familyProxyNode = createFamilyProxyNode(familyProxy)
    tree.addFamilyProxy(familyProxyNode)
  }
  for (const taskProxy of workflow.taskProxies) {
    const taskProxyNode = createTaskProxyNode(taskProxy)
    tree.addTaskProxy(taskProxyNode)
    // A TaskProxy could no jobs (yet)
    if (taskProxy.jobs) {
      for (const job of taskProxy.jobs) {
        const jobNode = createJobNode(job, taskProxy.latestMessage)
        tree.addJob(jobNode)
      }
    }
  }
}

export {
  createWorkflowNode,
  createCyclePointNode,
  createFamilyProxyNode,
  createTaskProxyNode,
  createJobNode,
  containsTreeData,
  populateTreeFromGraphQLData,
  JOB_DETAIL_NODE_PROPERTIES
}
