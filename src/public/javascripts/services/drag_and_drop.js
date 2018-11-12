import treeService from './tree.js';
import treeChangesService from './branches.js';

const dragAndDropSetup = {
    autoExpandMS: 600,
    dragStart: (node, data) => {
        if (node.data.noteId === 'root') {
            return false;
        }

        // this is for dragging notes into relation map
        data.dataTransfer.setData("text", JSON.stringify({
            noteId: node.data.noteId,
            title: node.data.title
        }));

        // This function MUST be defined to enable dragging for the tree.
        // Return false to cancel dragging of node.
        return true;
    },
    dragEnter: (node, data) => {
        // we don't allow moving root to any other location in the tree
        // we allow it to be placed on the relation map though, that's handled in a different drop handler
        return node.data.noteId === 'root';
    }, // allow drop on any node
    dragDrop: (node, data) => {
        // This function MUST be defined to enable dropping of items on the tree.
        // data.hitMode is 'before', 'after', or 'over'.

        const nodeToMove = data.otherNode;
        nodeToMove.setSelected(true);

        const selectedNodes = treeService.getSelectedNodes();

        if (data.hitMode === "before") {
            treeChangesService.moveBeforeNode(selectedNodes, node);
        }
        else if (data.hitMode === "after") {
            treeChangesService.moveAfterNode(selectedNodes, node);
        }
        else if (data.hitMode === "over") {
            treeChangesService.moveToNode(selectedNodes, node);
        }
        else {
            throw new Error("Unknown hitMode=" + data.hitMode);
        }
    }
};

export default dragAndDropSetup;