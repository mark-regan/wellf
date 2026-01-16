import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CookingLayout } from './Cooking';
import {
  FolderOpen,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { cookingApi } from '@/api/cooking';
import { RecipeCollection } from '@/types';

export function CookingCollections() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<RecipeCollection[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<RecipeCollection | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCollections = async () => {
    try {
      const data = await cookingApi.listCollections();
      setCollections(data);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await cookingApi.createCollection(name.trim(), description.trim() || undefined);
      await loadCollections();
      setShowAddModal(false);
      setName('');
      setDescription('');
    } catch (err) {
      console.error('Failed to create collection:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection || !name.trim()) return;
    setSubmitting(true);
    try {
      await cookingApi.updateCollection(editingCollection.id, name.trim(), description.trim() || undefined);
      await loadCollections();
      setShowEditModal(false);
      setEditingCollection(null);
      setName('');
      setDescription('');
    } catch (err) {
      console.error('Failed to update collection:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCollection = async (collection: RecipeCollection) => {
    if (!confirm(`Are you sure you want to delete "${collection.name}"? This will not delete the recipes in it.`)) return;
    try {
      await cookingApi.deleteCollection(collection.id);
      await loadCollections();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const openEditModal = (collection: RecipeCollection) => {
    setEditingCollection(collection);
    setName(collection.name);
    setDescription(collection.description || '');
    setShowEditModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setName('');
    setDescription('');
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingCollection(null);
    setName('');
    setDescription('');
  };

  return (
    <CookingLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Collections</h1>
            <p className="text-muted-foreground">Organize your recipes into folders</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-cooking hover:bg-cooking/90">
            <Plus className="mr-2 h-4 w-4" />
            New Collection
          </Button>
        </div>

        {/* Collections Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading collections...</div>
        ) : collections.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center text-center">
                <FolderOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-lg mb-2">No collections yet</h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  Create collections to organize your recipes by cuisine, occasion, or any way you like.
                </p>
                <Button onClick={() => setShowAddModal(true)} className="bg-cooking hover:bg-cooking/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Collection
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className="group hover:border-cooking/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/cooking/collections/${collection.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cooking/10">
                        <FolderOpen className="h-5 w-5 text-cooking" />
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-cooking transition-colors">
                          {collection.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {collection.recipe_count ?? 0} recipe{collection.recipe_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(collection);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!collection.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCollection(collection);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {collection.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {collection.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Collection Modal */}
      <Dialog open={showAddModal} onOpenChange={closeAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCollection} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                placeholder="e.g., Quick Weeknight Meals"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (optional)</label>
              <Input
                placeholder="A brief description of this collection"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeAddModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !name.trim()} className="bg-cooking hover:bg-cooking/90">
                {submitting ? 'Creating...' : 'Create Collection'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Collection Modal */}
      <Dialog open={showEditModal} onOpenChange={closeEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCollection} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                placeholder="Collection name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (optional)</label>
              <Input
                placeholder="A brief description of this collection"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !name.trim()} className="bg-cooking hover:bg-cooking/90">
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CookingLayout>
  );
}
