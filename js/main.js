const state = {
    currentView: 'user-onboarding',
    currentUser: null,
    posts: [],
    lists: [],
    editor: null,
    editorCurrentSelection: null
}

new Vue({
    el: '#app',
    data: {
        currentView: 'user-onboarding',
        currentUser: null,
        posts: []
    },
    async created() {
        this.currentView = 'user-picker';
    },
    methods: {

        async userSelected() {
            const user = await DatabaseService.getCurrentUser();
            state.currentUser = user;
            this.currentUser = user;
            this.currentView = 'feed-view';
            this.loadPosts();
        },

        switchView(view) {
            this.currentView = view;
        },
        async loadPosts() {
            this.posts = await DatabaseService.getPosts(state.currentUser.id);
        },
        async createdPost() {
            await this.loadPosts();
        },
        async likePost(postId) {
            // Handle liking posts
        }
    }
});