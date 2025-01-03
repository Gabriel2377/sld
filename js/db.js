const db = new Dexie('socialApp');

db.version(1).stores({
    users: '++id, name, createdAt',
    posts: '++id, userId, content, backgroundUrl, createdAt',
    lists: '++id, userId, name',
    savedPosts: '++id, postId, listId, userId'
});

const DatabaseService = {
    async initUser(name) {
        const userId = await db.users.add({
            name,
            createdAt: Date.now()
        });
        return db.users.get(userId);
    },

    // getUsers
    async getUsers() {
        return db.users.toArray();
    },

    async getCurrentUser() {
        // const user = await db.users.toArray();
        // return user[0] || null;
        const user = sessionStorage.getItem('currentUser');
        if (user) {
            this.currentUser = JSON.parse(user);
            return this.currentUser;
        }
        return null;
    },

    async addPost(post) {
        return db.posts.add(post);
    },

    async getPosts(userId) {
        let posts = await db.posts.where('userId').equals(userId)
                       .sortBy('createdAt');
        return posts.reverse();
    },

    // TODO: Implement the getPosts method to fetch posts incrementally
    async  __getPosts(userId, topPostId = null, bottomPostId = null, limit = 10, direction = 'older' ) {
        const query = db.posts.where('userId').equals(userId);
        
        let postsQuery;

        if (direction === 'older') {
            // Fetch posts older than topPostId, or if no topPostId, fetch the first `limit` posts
            if (topPostId !== null) {
                postsQuery = query.where('id').below(topPostId).sortBy('createdAt').limit(limit);
            } else {
                postsQuery = query.sortBy('createdAt').limit(limit);
            }
        } else if (direction === 'newer') {
            // Fetch posts newer than bottomPostId, or if no bottomPostId, fetch the first `limit` posts
            if (bottomPostId !== null) {
                postsQuery = query.where('id').above(bottomPostId).sortBy('createdAt', true).limit(limit);
            } else {
                postsQuery = query.sortBy('createdAt', true).limit(limit);
            }
        } else {
            throw new Error('Invalid direction, it should be either "older" or "newer"');
        }

        // Execute the query and return the result
        try {
            const posts = await postsQuery.toArray();
            return posts;
        } catch (error) {
            console.error("Error fetching posts: ", error);
            throw error;
        }
    },

    async createList(userId, name) {
        return db.lists.add({ userId, name });
    },

    async getLists(userId) {
        return db.lists.where('userId').equals(userId).toArray();
    },

    async savePostToList(postId, listId, userId) {
        return db.savedPosts.add({ postId, listId, userId });
    }
};