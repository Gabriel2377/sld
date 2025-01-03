Vue.component('feed-view', {
    template: html`
        <div class="feed-container">
            <div v-for="post in posts" 
                 :key="post.id" 
                 class="post"
                 :style="{ backgroundImage: 'url(' + post.backgroundUrl + ')' }">
                <div class="post-overlay" v-html="post.content"></div>
            </div>
            <div class="bottom-actions">            
                <button @click="$emit('switch-view', 'create-post')" v-longpress="showActionSheet" class="fab">
                    <i class="fas fa-plus"></i>
                </button>
            

                <!-- <button class="fab" @click="$emit('switch-view', 'create-post')">
                    <i class="fas fa-plus"></i>
                </button> -->
                <!-- <button class="fab" @click="showListModal = true">
                    <i class="fas fa-heart"></i>
                </button> -->
            </div>
            
            <!-- Action Sheet -->
            <div v-if="showActionSheetModal" class="modal" @click.self="showActionSheetModal = false">
                <div class="modal-content">
                    <h3>Actions</h3>
                    <button @click="$emit('switch-view', 'create-post')">Add Post</button>
                    <button @click="exportPosts">Export Posts</button>
                    <button @click="syncPosts">Sync Posts</button>
                    <button @click="triggerFileInput">Import Posts</button>
                    <input type="file" ref="fileInput" @change="importPosts" style="display: none;">
                </div>
            </div>

            <!-- Save to List Modal -->
            <div v-if="showListModal" class="modal" @click.self="showListModal = false">
                <div class="modal-content">
                    <h3>Save to List</h3>
                    <div v-for="list in lists" :key="list.id">
                        <button @click="saveToList(list.id)">{{ list.name }}</button>
                    </div>
                    <input v-model="newListName" placeholder="New list name">
                    <button @click="createNewList">Create New List</button>
                </div>
            </div>

            <!-- Sync posts Modal -->
            <div v-if="showSyncModal" class="modal" @click.self="showSyncModal = false">
                <div class="modal-content">
                    <h3>Sync posts with PIN</h3>
                    <input v-model="SyncPIN" 
                           type="text" 
                           placeholder="Enter PIN">
                    <button @click="getSync">Receive</button>
                    <button @click="sendSync">Send</button>
                    <button @click="showSyncModal = false">Cancel</button>
                </div>
            </div>

        </div>
    `,
    props: ['posts'],
    data() {
        return {
            showActionSheetModal: false,
            showListModal: false,
            lists: [],
            newListName: '',
            loadingOlder: false,
            loadingNewer: false,
            limit: 2,
            showSyncModal: false,
            SyncPIN: '',

        };
    },
    async created() {
        this.lists = await DatabaseService.getLists(state.currentUser.id);
        //TODO: Add event listener for scroll
        // window.addEventListener('scroll', this.handleScroll);
    },
    beforeDestroy() {
        //TODO: Remove event listener for scroll
        // window.removeEventListener('scroll', this.handleScroll);
    },
    methods: {

        handleScroll() {
            const bottomOfWindow = window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
            const topOfWindow = window.scrollY === 0;
            if (bottomOfWindow) {
                this.loadOlderPosts();
            }
            if (topOfWindow) {
                this.loadNewerPosts();
            }
        },

        async loadOlderPosts() {
            if (this.loadingOlder) return;
            this.loadingOlder = true;
            const bottomPostId = this.posts.length ? this.posts[this.posts.length - 1].id : null;
            const newPosts = await DatabaseService.getPosts(state.currentUser.id, null, bottomPostId, this.limit, 'older');
            this.posts = [...this.posts, ...newPosts];
            this.loadingOlder = false;
        },

        async loadNewerPosts() {
            if (this.loadingNewer) return;
            this.loadingNewer = true;
            const topPostId = this.posts.length ? this.posts[0].id : null;
            const newPosts = await DatabaseService.getPosts(state.currentUser.id, topPostId, null, this.limit, 'newer');
            this.posts = [...newPosts, ...this.posts];
            this.loadingNewer = false;
        },

        async syncPosts() {
            this.showSyncModal = true;
        },

        async getSync() {
            let syncDone = await DatabaseService.receivePosts(this.SyncPIN, state.currentUser.id);
            if (syncDone) {
                this.showSyncModal = false;
                // emit user-selected event to reload posts
                this.$emit('user-selected');
            }
            this.posts = posts;
            this.showSyncModal = false;
        },

        async sendSync() {
            let syncDone = await DatabaseService.sendPosts(this.SyncPIN, state.currentUser.id);
            if (!syncDone) {
                this.$emit('show-toast', 'Posts NOT sent successfully', 3000);
            }
            else
                this.$emit('show-toast', 'Posts sent successfully', 3000);
            this.showSyncModal = false;
        },

        async createNewList() {
            if (!this.newListName) return;
            await DatabaseService.createList(state.currentUser.id, this.newListName);
            this.lists = await DatabaseService.getLists(state.currentUser.id);
            this.newListName = '';
        },
        async saveToList(listId) {
            await DatabaseService.savePostToList(
                this.currentPost.id,
                listId,
                state.currentUser.id
            );
            this.showListModal = false;
        },
        showActionSheet() {
            this.showActionSheetModal = true;
        },
        triggerFileInput() {
            this.$refs.fileInput.click();
        },
        async exportPosts() {
            const posts = await DatabaseService.getPosts(state.currentUser.id);
            const json = JSON.stringify(posts);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${stringTSFS()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.$emit('show-toast', 'Posts exported successfully', 3000);

        },
        async importPosts(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    let posts = [];
                    try {
                        posts = JSON.parse(e.target.result);
                    } catch (error) {
                        this.$emit('show-toast', 'Posts NOT imported successfully', 3000);
                        
                        // alert('Posts not imported ...');
                        console.error(error);
                        return;
                    }

                    for (const post of posts) {
                        // Reset the userID
                        post.userId = state.currentUser.id;
                        await DatabaseService.addPost(post);
                    }
                    // emit user-selected event to reload posts
                    this.$emit('user-selected');
                    this.$emit('show-toast', 'Posts imported successfully');
                };
                reader.readAsText(file);
            }
        }
    }
});